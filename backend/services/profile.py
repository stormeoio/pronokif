"""
PRONOKIF - Profile / stats / missions service.

Business logic for public profiles, user stats and the mission system.
Routes layer (routes/profile.py) just validates inputs, calls these
functions and shapes HTTP responses.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from config import db
from features import (
    MISSIONS,
    get_default_user_stats,
    get_level_from_xp,
    get_user_mission_progress,
)
from services.auth import send_user_notification
from services.predictions import count_individual_predictions
from services.race_calendar import active_2026_races


class MissionError(Exception):
    """Raised on mission claim violations. Route layer maps to 400/404."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class UserNotFoundError(Exception):
    """Raised when a target user does not exist (404 at the route layer)."""


# ---------------------------------------------------------------- profile ---


async def get_public_profile(target_user_id: str, requesting_user_id: str) -> dict:
    """Build the public profile payload for `target_user_id` as seen by
    `requesting_user_id` (used to surface leagues they share)."""
    target_user = await db.users.find_one(
        {"id": target_user_id},
        {"_id": 0, "password_hash": 0, "email": 0},
    )
    if not target_user:
        raise UserNotFoundError("User not found")

    stats = await db.user_stats.find_one({"user_id": target_user_id}, {"_id": 0}) or get_default_user_stats()

    total_predictions = await count_individual_predictions(target_user_id)
    races_participated = await db.predictions.count_documents({"user_id": target_user_id})

    user_leagues = await db.leagues.find({"members": requesting_user_id}, {"_id": 0}).to_list(100)
    target_leagues = await db.leagues.find({"members": target_user_id}, {"_id": 0}).to_list(100)

    user_league_ids = {league["id"] for league in user_leagues}
    common_leagues: list[dict] = []

    for league in target_leagues:
        if league["id"] not in user_league_ids:
            continue
        leaderboard = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
        leaderboard.sort(key=lambda x: x.get("total_points", 0), reverse=True)
        position = next(
            (i + 1 for i, e in enumerate(leaderboard) if e["user_id"] == target_user_id),
            None,
        )
        total_points = next(
            (e.get("total_points", 0) for e in leaderboard if e["user_id"] == target_user_id),
            0,
        )
        common_leagues.append(
            {
                "id": league["id"],
                "name": league["name"],
                "position": position,
                "total_points": total_points,
                "members_count": len(league["members"]),
            }
        )

    recent_predictions = (
        await db.predictions.find(
            {"user_id": target_user_id},
            {
                "_id": 0,
                "quali_top10": 0,
                "race_top10": 0,
                "sprint_quali_top10": 0,
                "sprint_race_top10": 0,
            },
        )
        .sort("created_at", -1)
        .limit(5)
        .to_list(5)
    )

    race_map = {r["id"]: r["name"] for r in active_2026_races()}
    for pred in recent_predictions:
        pred["race_name"] = race_map.get(pred["race_id"], pred["race_id"])

    reaction_best = await db.minigame_scores.find_one(
        {"user_id": target_user_id, "game_type": "reaction"},
        {"_id": 0},
        sort=[("score", 1)],
    )
    batak_best = await db.minigame_scores.find_one(
        {"user_id": target_user_id, "game_type": "batak"},
        {"_id": 0},
        sort=[("score", -1)],
    )

    return {
        "id": target_user["id"],
        "username": target_user.get("username", "Anonymous"),
        "avatar_id": target_user.get("avatar_id"),
        "custom_avatar_url": target_user.get("custom_avatar_url"),
        "level": target_user.get("level", 1),
        "xp": target_user.get("xp", 0),
        "created_at": target_user.get("created_at"),
        "stats": {
            "total_predictions": total_predictions,
            "correct_poles": stats.get("correct_poles", stats.get("poles_correct", 0)),
            "correct_winners": stats.get("correct_winners", stats.get("winners_correct", 0)),
            "perfect_top10": stats.get("perfect_top10", 0),
            "races_participated": races_participated,
        },
        "leagues": common_leagues,
        "recent_predictions": recent_predictions,
        "minigames": {
            "reaction_best_ms": reaction_best.get("score") if reaction_best else None,
            "batak_best_score": batak_best.get("score") if batak_best else None,
        },
    }


# ------------------------------------------------------------------ stats ---


async def get_or_create_stats(user_id: str) -> dict:
    """Return a user's stats doc, creating defaults on first read."""
    stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if stats:
        return stats
    stats = {"user_id": user_id, **get_default_user_stats()}
    await db.user_stats.insert_one(stats)
    return stats


# --------------------------------------------------------------- missions ---


async def list_missions(user_id: str) -> dict:
    """Return mission progress for a user, grouped by category."""
    stats_doc = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0}) or get_default_user_stats()

    completed = await db.user_missions.find({"user_id": user_id, "completed": True}, {"_id": 0}).to_list(1000)
    completed_ids = {m["mission_id"] for m in completed}

    progress = get_user_mission_progress(stats_doc)
    for p in progress:
        p["claimed"] = p["mission_id"] in completed_ids

    return {
        "missions": progress,
        "categories": {
            "assiduity": [p for p in progress if p["category"] == "assiduity"],
            "performance": [p for p in progress if p["category"] == "performance"],
            "social": [p for p in progress if p["category"] == "social"],
            "minigames": [p for p in progress if p["category"] == "minigames"],
        },
    }


async def claim_mission(user_id: str, mission_id: str) -> dict:
    """Award XP for a completed mission. Raises MissionError on conflict."""
    mission = next((m for m in MISSIONS if m["id"] == mission_id), None)
    if not mission:
        raise MissionError("Mission not found", status_code=404)

    existing = await db.user_missions.find_one({"user_id": user_id, "mission_id": mission_id, "completed": True})
    if existing:
        raise MissionError("Mission already claimed")

    stats_doc = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if not stats_doc or stats_doc.get(mission["stat"], 0) < mission["target"]:
        raise MissionError("Mission not completed")

    xp_reward = mission["xp_reward"]
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0}) or {}
    new_xp = user_data.get("xp", 0) + xp_reward
    new_level = get_level_from_xp(new_xp)

    await db.users.update_one({"id": user_id}, {"$set": {"xp": new_xp, "level": new_level}})
    await db.user_missions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "mission_id": mission_id,
            "completed": True,
            "claimed_at": datetime.now(UTC).isoformat(),
        }
    )

    await send_user_notification(
        user_id,
        f"Mission '{mission['name']}' complétée ! +{xp_reward} XP",
        "mission_complete",
    )

    level_up = new_level > user_data.get("level", 1)
    if level_up:
        await send_user_notification(user_id, f"Niveau {new_level} atteint !", "level_up")

    return {
        "message": "Mission claimed",
        "xp_earned": xp_reward,
        "new_xp": new_xp,
        "new_level": new_level,
        "level_up": level_up,
    }


# ----------------------------------------------------------------- streak ---


async def get_streak(user_id: str) -> dict:
    """Compute the user's current and longest prediction streak.

    A streak day = any race where the user submitted a prediction.
    We count consecutive race predictions (not calendar days).
    """
    # Get all predictions sorted by creation date (most recent first)
    predictions = (
        await db.predictions.find(
            {"user_id": user_id},
            {"race_id": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .to_list(200)
    )

    if not predictions:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_prediction_date": None,
            "is_active_today": False,
        }

    # Build set of race IDs user predicted on
    predicted_race_ids = {p["race_id"] for p in predictions}

    # Get ordered race list (past races only — those with dates before now)
    now = datetime.now(UTC)

    def parse_race_date(date_str: str) -> datetime:
        """Parse race date string into timezone-aware datetime."""
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt

    past_races = [
        r
        for r in active_2026_races()
        if parse_race_date(r["date"]) <= now
    ]
    # Most recent first
    past_races.sort(key=lambda r: parse_race_date(r["date"]), reverse=True)

    if not past_races:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_prediction_date": predictions[0].get("created_at"),
            "is_active_today": False,
        }

    # Count current streak (consecutive races from the most recent)
    current_streak = 0
    for race in past_races:
        if race["id"] in predicted_race_ids:
            current_streak += 1
        else:
            break

    # Longest streak (scan all)
    longest_streak = 0
    streak = 0
    for race in reversed(past_races):
        if race["id"] in predicted_race_ids:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0

    # Is active today: check if the most recent race has a prediction
    is_active_today = past_races[0]["id"] in predicted_race_ids if past_races else False

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest_streak, current_streak),
        "last_prediction_date": predictions[0].get("created_at"),
        "is_active_today": is_active_today,
    }
