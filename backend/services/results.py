"""
PRONOKIF - Race results service.

Business logic for officials results: reading, persisting, and the
side-effect heavy scoring pass that updates every user's XP, level,
notifications and league leaderboard entries.

Authorization note
------------------
The original server.py endpoints gated /admin/results and /admin/races
on "is this user the creator of at least one league?" — NOT on the
ADMIN_EMAIL check used by services.admin.require_admin. We preserve that
behavior here via `require_league_creator` so existing league-creator
operators keep their access. Switching to require_admin would be a
breaking change.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, status

from config import db
from data.f1_data import F1_RACES_2026
from services.auth import get_current_user, send_user_notification
from services.scoring import calculate_points

# ---------- Auth helper -------------------------------------------------


async def _is_league_creator(user: dict) -> bool:
    leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    return bool(leagues)


async def require_league_creator(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dep: 403 unless the caller has created at least one league."""
    if not await _is_league_creator(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only league creators can access this endpoint",
        )
    return user


# ---------- Read paths --------------------------------------------------


async def get_official(race_id: str, user: dict) -> dict:
    """Return the official results for a race plus the caller's own
    prediction and the points it would score. 404 when no results yet."""
    result = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results not available yet",
        )

    prediction = await db.predictions.find_one({"user_id": user["id"], "race_id": race_id}, {"_id": 0})
    points = calculate_points(prediction, result["results"]) if prediction else None
    return {"results": result["results"], "prediction": prediction, "points": points}


async def list_admin_races() -> list[dict]:
    """Return every race in the calendar with its status flags for the
    admin race-picker UI."""
    out: list[dict] = []
    now = datetime.now(UTC)
    for race in F1_RACES_2026:
        result = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        out.append(
            {
                "id": race["id"],
                "name": race["name"],
                "date": race["date"],
                "has_results": result is not None,
                "is_past": now > race_date,
                "is_sprint": race.get("is_sprint", False),
            }
        )
    return out


async def get_admin_detail(race_id: str) -> dict | None:
    """Raw stored result document for a race (admin view)."""
    return await db.race_results.find_one({"race_id": race_id}, {"_id": 0})


# ---------- Write path: results + scoring batch -------------------------


async def set_official_and_score(*, race_id: str, results: dict, entered_by: str) -> int:
    """Upsert official results then score every prediction for the race.

    Side effects per matched prediction:
      - increment user.xp
      - bump user.level on XP threshold + notify
      - notify the user of points earned
      - increment league leaderboard total_points + last_race_points
        and snapshot previous_position
    Finally locks all predictions for the race.

    Returns the number of predictions processed.
    """
    await db.race_results.update_one(
        {"race_id": race_id},
        {
            "$set": {
                "race_id": race_id,
                "results": results,
                "entered_by": entered_by,
                "entered_at": datetime.now(UTC).isoformat(),
            }
        },
        upsert=True,
    )

    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)

    race_name = next((r["name"] for r in F1_RACES_2026 if r["id"] == race_id), race_id)

    for pred in predictions:
        points = calculate_points(pred, results)
        user_id = pred["user_id"]

        await db.users.update_one({"id": user_id}, {"$inc": {"xp": points["xp_earned"]}})

        user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_data:
            continue

        new_xp = user_data.get("xp", 0) + points["xp_earned"]
        new_level = (new_xp // 100) + 1
        if new_level > user_data.get("level", 1):
            await db.users.update_one({"id": user_id}, {"$set": {"level": new_level}})
            await send_user_notification(user_id, f"Niveau {new_level} atteint !", "level_up")

        await send_user_notification(
            user_id,
            f"Résultats {race_name}: +{points['total']} pts!",
            "results",
        )

        leagues = await db.leagues.find({"members": user_id}, {"_id": 0}).to_list(100)
        for league in leagues:
            entry = await db.leaderboard.find_one({"league_id": league["id"], "user_id": user_id})
            if not entry:
                continue
            all_entries = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
            all_entries.sort(key=lambda x: x["total_points"], reverse=True)
            current_pos = next(
                (i + 1 for i, e in enumerate(all_entries) if e["user_id"] == user_id),
                len(all_entries),
            )
            await db.leaderboard.update_one(
                {"id": entry["id"]},
                {
                    "$inc": {"total_points": points["total"]},
                    "$set": {
                        "last_race_points": points["total"],
                        "previous_position": current_pos,
                    },
                },
            )

    await db.predictions.update_many({"race_id": race_id}, {"$set": {"locked": True}})
    return len(predictions)


def build_results_payload(data: Any) -> dict:
    """Reshape the validated RaceResultsInput into the storage layout."""
    return {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "sprint_quali_top10": data.sprint_quali_top10,
        "sprint_race_top10": data.sprint_race_top10,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus": {
            "safety_car": data.safety_car,
            "dnf_drivers": data.dnf_drivers,
            "fastest_lap": data.fastest_lap,
            "first_corner_leader": data.first_corner_leader,
        },
    }
