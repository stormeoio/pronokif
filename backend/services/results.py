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

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from config import db, logger
from services.auth import get_current_user, send_user_notification
from services.championships import championship_context_for_race_id
from services.league_membership import (
    current_leaderboard_position,
    ensure_leaderboard_entry,
)
from services.race_calendar import active_2026_races
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
    return {
        "results": result["results"],
        "prediction": prediction,
        "points": points,
        # Surfaced for the frontend "results updated (FIA decision)" banner.
        "corrected_at": result.get("corrected_at"),
        "updated_at": result.get("updated_at"),
    }


async def list_admin_races() -> list[dict]:
    """Return every race in the calendar with its status flags for the
    admin race-picker UI."""
    out: list[dict] = []
    now = datetime.now(UTC)
    for race in active_2026_races():
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


def official_score_payload(
    *,
    prediction: dict,
    race_id: str,
    points: dict,
    championship_context: dict,
    scored_at: str,
    scored_by: str,
) -> dict:
    """Build the persisted official score snapshot for one prediction."""
    return {
        "score_type": "official_race",
        "prediction_id": prediction.get("id"),
        "race_id": race_id,
        "user_id": prediction["user_id"],
        **championship_context,
        "points_total": int(points.get("total") or 0),
        "xp_awarded": int(points.get("xp_earned") or 0),
        "breakdown": {
            "quali_pole": int(points.get("quali_pole") or 0),
            "quali_top10": int(points.get("quali_top10") or 0),
            "sprint_quali_top10": int(points.get("sprint_quali_top10") or 0),
            "sprint_race_top10": int(points.get("sprint_race_top10") or 0),
            "race_winner": int(points.get("race_winner") or 0),
            "race_top10": int(points.get("race_top10") or 0),
            "bonus": int(points.get("bonus") or 0),
        },
        "details": points.get("details") or [],
        "scored_at": scored_at,
        "scored_by": scored_by,
    }


def official_score_delta(previous_score: dict | None, next_score: dict) -> dict:
    """Return point and XP deltas against a previous persisted score."""
    return {
        "points_delta": int(next_score.get("points_total") or 0) - int((previous_score or {}).get("points_total") or 0),
        "xp_delta": int(next_score.get("xp_awarded") or 0) - int((previous_score or {}).get("xp_awarded") or 0),
    }


async def _upsert_official_score(score: dict) -> dict | None:
    prediction_id = score.get("prediction_id")
    query = (
        {"score_type": "official_race", "prediction_id": prediction_id}
        if prediction_id
        else {"score_type": "official_race", "race_id": score["race_id"], "user_id": score["user_id"]}
    )
    # Atomic read-modify-write: capture the previous snapshot AND persist the new
    # one in a single operation so that concurrent scorers cannot both observe
    # previous=None and double-apply the same XP / leaderboard delta. The auto-sync
    # loop runs in every uvicorn worker (Dockerfile: --workers 2), so two passes
    # can score the same prediction simultaneously during a race window. Mongo
    # serializes find_one_and_update per document, so exactly one caller sees the
    # pre-insert state (delta = full points); the other sees the snapshot we just
    # wrote (delta = 0). Across any interleaving the deltas sum to the absolute
    # total, which keeps the downstream $inc on user XP and leaderboard idempotent.
    previous_score = await db.prediction_scores.find_one_and_update(
        query,
        {
            "$set": score,
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "created_at": score["scored_at"],
            },
        },
        upsert=True,
        return_document=ReturnDocument.BEFORE,
        projection={"_id": 0},
    )
    return previous_score


def _results_notification_message(race_name: str, points_delta: int, points_total: int) -> str:
    if points_delta == points_total:
        return f"Résultats {race_name}: +{points_total} pts!"
    sign = "+" if points_delta > 0 else ""
    return f"Correction {race_name}: {sign}{points_delta} pts, total course {points_total} pts."


# Stale locks left behind by a crashed worker self-expire after this window
# (also enforced by a TTL index on sync_locks.expires_at — see services.indexes).
SCORE_LOCK_TTL_SECONDS = 600


async def _acquire_score_lock(race_id: str, token: str) -> bool:
    """Best-effort per-race advisory lock around the scoring pass.

    Correctness does NOT depend on this lock: the scoring write itself is
    idempotent under concurrency (see ``_upsert_official_score``). The lock only
    stops a second worker from redundantly re-walking the pass — which would emit
    duplicate level-up notifications and create duplicate leaderboard rows — and
    avoids wasted work. Acquisition steals the lock if the prior holder's TTL has
    lapsed, so a crashed worker can never wedge a race permanently.
    """
    key = f"score:{race_id}"
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=SCORE_LOCK_TTL_SECONDS)
    try:
        await db.sync_locks.insert_one(
            {"_id": key, "token": token, "locked_at": now, "expires_at": expires_at}
        )
        return True
    except DuplicateKeyError:
        stolen = await db.sync_locks.find_one_and_update(
            {"_id": key, "expires_at": {"$lt": now}},
            {"$set": {"token": token, "locked_at": now, "expires_at": expires_at}},
        )
        return stolen is not None


async def _release_score_lock(race_id: str, token: str) -> None:
    """Release the lock only if we still hold it (token guards against releasing
    a lock another worker stole after our TTL expired)."""
    await db.sync_locks.delete_one({"_id": f"score:{race_id}", "token": token})


async def set_official_and_score(
    *,
    race_id: str,
    results: dict,
    entered_by: str,
    auto_synced: bool = False,
    mark_correction: bool = False,
) -> int:
    """Upsert official results then score every prediction for the race.

    Wraps the auto-sync scoring pass in a best-effort per-race advisory lock so
    the two uvicorn workers do not both re-score the same race. Returns ``0`` when
    another worker already holds the lock; the lock holder performs the real work.

    Manual entries (``auto_synced=False`` — admin / league-creator endpoints)
    bypass the skip-if-locked guard and always run: they persist operator-entered
    results that may differ from what auto-sync would fetch, so they must never be
    silently dropped because a background pass briefly holds the lock. Scoring
    correctness across any overlap is guaranteed by the idempotent snapshot delta,
    not by the lock.

    ``mark_correction`` records a post-completion correction (a result that
    changed after it was already classified — e.g. an FIA decision): it stamps
    ``corrected_at`` on the race_results doc so the frontend can flag the update.
    """
    if not auto_synced:
        return await _apply_official_results_and_score(
            race_id=race_id,
            results=results,
            entered_by=entered_by,
            auto_synced=auto_synced,
            mark_correction=mark_correction,
        )

    lock_token = str(uuid.uuid4())
    if not await _acquire_score_lock(race_id, lock_token):
        logger.info("[Scoring] Skipped %s: another worker holds the scoring lock", race_id)
        return 0
    try:
        return await _apply_official_results_and_score(
            race_id=race_id,
            results=results,
            entered_by=entered_by,
            auto_synced=auto_synced,
            mark_correction=mark_correction,
        )
    finally:
        await _release_score_lock(race_id, lock_token)


async def _apply_official_results_and_score(
    *,
    race_id: str,
    results: dict,
    entered_by: str,
    auto_synced: bool = False,
    mark_correction: bool = False,
) -> int:
    """Upsert official results then score every prediction for the race.

    Side effects per matched prediction:
      - persist one official score snapshot per prediction
      - apply only XP and leaderboard deltas vs. the previous snapshot
      - update level and notifications only when the delta changes state
      - lock all predictions for the race
    Finally locks all predictions for the race.

    Returns the number of predictions processed.
    """
    championship_context = await championship_context_for_race_id(race_id)
    now = datetime.now(UTC).isoformat()
    result_set: dict[str, Any] = {
        "race_id": race_id,
        **championship_context,
        "results": results,
        "entered_by": entered_by,
        # ``updated_at`` always tracks the last write; ``entered_at`` (below) is
        # pinned to first creation so a re-validation pass that re-writes a race
        # never bumps its "first posted" time (which would resurface it via
        # get_latest_unseen) and so corrections keep the original posting date.
        "updated_at": now,
        "auto_synced": auto_synced,
    }
    if mark_correction:
        result_set["corrected_at"] = now
    await db.race_results.update_one(
        {"race_id": race_id},
        {
            "$set": result_set,
            "$setOnInsert": {"entered_at": now},
        },
        upsert=True,
    )

    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)

    race_name = next((r["name"] for r in active_2026_races() if r["id"] == race_id), race_id)

    for pred in predictions:
        points = calculate_points(pred, results)
        user_id = pred["user_id"]
        score = official_score_payload(
            prediction=pred,
            race_id=race_id,
            points=points,
            championship_context=championship_context,
            scored_at=now,
            scored_by=entered_by,
        )
        previous_score = await _upsert_official_score(score)
        delta = official_score_delta(previous_score, score)
        points_delta = delta["points_delta"]
        xp_delta = delta["xp_delta"]

        update_prediction_query = {"id": pred["id"]} if pred.get("id") else {"user_id": user_id, "race_id": race_id}
        await db.predictions.update_one(
            update_prediction_query,
            {
                "$set": {
                    "locked": True,
                    **championship_context,
                    "official_score": {
                        "points_total": score["points_total"],
                        "xp_awarded": score["xp_awarded"],
                        "points_delta": points_delta,
                        "xp_delta": xp_delta,
                        "scored_at": now,
                    },
                }
            },
        )

        if xp_delta:
            await db.users.update_one({"id": user_id}, {"$inc": {"xp": xp_delta}})
        user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user_data:
            continue

        stored_xp = int(user_data.get("xp", 0) or 0)
        new_xp = max(stored_xp, 0)
        if stored_xp < 0:
            await db.users.update_one({"id": user_id}, {"$set": {"xp": 0}})
        new_level = max((new_xp // 100) + 1, 1)
        if new_level != user_data.get("level", 1):
            await db.users.update_one({"id": user_id}, {"$set": {"level": new_level}})
            if new_level > user_data.get("level", 1):
                await send_user_notification(user_id, f"Niveau {new_level} atteint !", "level_up")

        if points_delta:
            await send_user_notification(
                user_id,
                _results_notification_message(race_name, points_delta, score["points_total"]),
                "results",
            )

        leagues = await db.leagues.find({"members": user_id}, {"_id": 0}).to_list(100)
        for league in leagues:
            entry = await ensure_leaderboard_entry(league, user_id)
            current_pos = await current_leaderboard_position(league, user_id)
            leaderboard_set = {
                **championship_context,
                "previous_position": current_pos,
                "updated_at": now,
            }
            if points_delta:
                leaderboard_set["last_race_points"] = score["points_total"]
            update_payload: dict[str, Any] = {"$set": leaderboard_set}
            if points_delta:
                update_payload["$inc"] = {
                    "total_points": points_delta,
                    "official_prediction_points": points_delta,
                }
            await db.leaderboard.update_one({"id": entry["id"]}, update_payload)

    await db.predictions.update_many(
        {"race_id": race_id},
        {"$set": {"locked": True, **championship_context}},
    )
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


# ---------- Latest unseen result ------------------------------------------


async def get_latest_unseen(user_id: str) -> dict | None:
    """Find the most recent race with results that the user predicted but hasn't 'viewed'.

    We track views with a simple collection `result_views`.
    If no unseen results, returns None.
    """
    # Get all races with results
    results = await db.race_results.find(
        {}, {"race_id": 1, "_id": 0}
    ).sort("entered_at", -1).to_list(50)

    if not results:
        return None

    result_race_ids = [r["race_id"] for r in results]

    # Get races the user has already viewed
    viewed = await db.result_views.find(
        {"user_id": user_id, "race_id": {"$in": result_race_ids}},
        {"race_id": 1, "_id": 0},
    ).to_list(100)
    viewed_ids = {v["race_id"] for v in viewed}

    # Find first unseen race (most recent first)
    for race_id in result_race_ids:
        if race_id in viewed_ids:
            continue

        # Check if user predicted this race
        pred = await db.predictions.find_one(
            {"user_id": user_id, "race_id": race_id},
            {"_id": 0, "race_id": 1},
        )
        if not pred:
            continue

        # Get race name
        race_info = next((r for r in active_2026_races() if r["id"] == race_id), None)
        race_name = race_info["name"] if race_info else race_id

        # Get user's score for this race from leaderboard or compute
        # Simple approach: count from user's last_race_points in leaderboard
        return {
            "race_id": race_id,
            "race_name": race_name,
            "user_score": None,  # Will be filled when results page loads
            "position_in_league": None,
            "total_players": None,
        }

    return None
