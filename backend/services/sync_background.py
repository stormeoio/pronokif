"""
PRONOKIF — Background sync operations.

Split from services/sync.py (Sprint 4 R-001 compliance).

Contains:
* ``sync_race_from_api`` — fetch + persist + score for a single race (background-friendly)
* ``sync_all_pending`` — iterate every past race missing results
* ``sync_status`` — read-only sync state for admin
* ``send_reminders`` — notification for users who haven't predicted
* ``auto_sync_loop`` — background coroutine running hourly
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from config import db, logger
from services.auth import send_user_notification
from services.race_calendar import active_2026_races, race_start_at_utc, syncable_2026_races

AUTO_SYNC_INTERVAL_HOURS = 1
AUTO_SYNC_ACTIVE_INTERVAL_SECONDS = 300
AUTO_SYNC_ENTERED_BY = "system-auto-sync"
RACE_SYNC_WINDOW_START_HOURS_BEFORE = 1
RACE_SYNC_WINDOW_END_HOURS_AFTER = 12


def _race_start_at_utc(race: dict) -> datetime:
    """Return the race start as UTC, interpreting calendar times as local."""
    race_start = race_start_at_utc(race)
    if race_start is None:
        raise ValueError(f"Invalid race schedule for {race.get('id')}")
    return race_start


def _race_sync_window(race: dict) -> tuple[datetime, datetime]:
    """Window where the app should poll frequently for official results."""
    race_start = _race_start_at_utc(race)
    return (
        race_start - timedelta(hours=RACE_SYNC_WINDOW_START_HOURS_BEFORE),
        race_start + timedelta(hours=RACE_SYNC_WINDOW_END_HOURS_AFTER),
    )


def _has_complete_results(result_doc: dict | None) -> bool:
    """Stored results are complete enough to score once and stop polling."""
    if not result_doc:
        return False
    results = result_doc.get("results") or {}
    return bool(results.get("race_winner") and results.get("race_top10"))


def _is_inside_race_sync_window(race: dict, now: datetime) -> bool:
    window_start, window_end = _race_sync_window(race)
    return window_start <= now <= window_end


def _should_attempt_result_sync(
    race: dict,
    now: datetime,
    result_doc: dict | None,
) -> bool:
    """Sync from one hour before race start until results are complete."""
    if _has_complete_results(result_doc):
        return False
    window_start, _ = _race_sync_window(race)
    return now >= window_start


async def sync_race_from_api(race: dict) -> dict:
    """Background-friendly variant: fetch + persist + score for a single race.

    Used by the auto-sync loop and by ``sync_all_pending``. Returns
    ``{"success": bool, "winner"/"error": ...}``.
    """
    try:
        # Import lazily to avoid a module-level circular import: services.sync
        # re-exports these background functions for backward compatibility.
        from services.sync import auto_sync_and_save

        result = await auto_sync_and_save(race["id"], AUTO_SYNC_ENTERED_BY)
        fetched_data: dict[str, Any] = result.get("fetched_data") or {}
        success = result.get("status") == "success" and bool(
            fetched_data.get("race_winner")
        )

        return {
            **result,
            "success": success,
            "winner": fetched_data.get("race_winner"),
            "error": None if success else result.get("message", "No winner found"),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def sync_all_pending() -> dict:
    """Sync every race whose result window has opened and lacks results."""
    now = datetime.now(UTC)
    synced: list[dict] = []
    failed: list[dict] = []

    for race in syncable_2026_races():
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        if not _should_attempt_result_sync(race, now, result_doc):
            continue

        sync_result = await sync_race_from_api(race)
        if sync_result.get("success"):
            synced.append({"race": race["name"], "winner": sync_result.get("winner")})
        else:
            failed.append({"race": race["name"], "error": sync_result.get("error")})

    return {
        "message": f"Sync completed: {len(synced)} synced, {len(failed)} failed",
        "synced": synced,
        "failed": failed,
    }


async def sync_status() -> dict:
    """Read-only snapshot of the auto-sync state for every race."""
    now = datetime.now(UTC)
    races_status: list[dict] = []

    for race in active_2026_races():
        if race.get("is_cancelled"):
            races_status.append(
                {
                    "id": race["id"],
                    "name": race["name"],
                    "date": race["date"],
                    "race_start_at": None,
                    "sync_window_start": None,
                    "sync_window_end": None,
                    "status": "cancelled",
                    "has_results": False,
                    "auto_synced": False,
                }
            )
            continue

        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        has_results = _has_complete_results(result_doc)
        window_start, window_end = _race_sync_window(race)

        status = "upcoming"
        if has_results:
            status = "synced"
        elif window_start <= now <= window_end:
            status = "live_sync_window"
        elif now > window_end:
            status = "pending_sync"

        races_status.append(
            {
                "id": race["id"],
                "name": race["name"],
                "date": race["date"],
                "race_start_at": _race_start_at_utc(race).isoformat(),
                "sync_window_start": window_start.isoformat(),
                "sync_window_end": window_end.isoformat(),
                "status": status,
                "has_results": has_results,
                "auto_synced": result_doc.get("auto_synced", False) if result_doc else False,
            }
        )

    return {
        "auto_sync_enabled": True,
        "sync_interval_hours": AUTO_SYNC_INTERVAL_HOURS,
        "active_sync_interval_seconds": AUTO_SYNC_ACTIVE_INTERVAL_SECONDS,
        "races": races_status,
        "summary": {
            "synced": len([r for r in races_status if r["status"] == "synced"]),
            "pending": len([r for r in races_status if r["status"] == "pending_sync"]),
            "live_sync_window": len([r for r in races_status if r["status"] == "live_sync_window"]),
            "upcoming": len([r for r in races_status if r["status"] == "upcoming"]),
            "cancelled": len([r for r in races_status if r["status"] == "cancelled"]),
        },
    }


async def send_reminders() -> dict:
    """Notify users who have not pronostiqued for a race closing in ~24h."""
    now = datetime.now(UTC)
    notifications_sent = 0

    for race in syncable_2026_races():
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        time_until_close = predictions_close - now

        if timedelta(hours=23) < time_until_close < timedelta(hours=25):
            all_users = await db.users.find({}, {"_id": 0}).to_list(10000)
            for u in all_users:
                if not u.get("id"):
                    continue
                existing = await db.predictions.find_one({"user_id": u["id"], "race_id": race["id"]})
                if not existing:
                    await send_user_notification(
                        u["id"], f"Rappel: Predictions {race['name']} close in 24h!", "reminder"
                    )
                    notifications_sent += 1

    return {"message": f"{notifications_sent} reminders sent"}


async def auto_sync_loop() -> None:
    """Background coroutine: sync opened race windows until results are stored.

    Polls every five minutes during an active race result window, then falls
    back to hourly catch-up for older races. It respects ``CancelledError`` so
    the FastAPI shutdown hook can stop it cleanly.
    """
    while True:
        try:
            now = datetime.now(UTC)
            logger.info(f"[Auto-Sync] Starting automatic results synchronization at {now.isoformat()}")

            synced_races: list[str] = []
            active_window_open = False

            for race in syncable_2026_races():
                result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
                if _is_inside_race_sync_window(race, now) and not _has_complete_results(result_doc):
                    active_window_open = True

                if not _should_attempt_result_sync(race, now, result_doc):
                    continue

                try:
                    sync_result = await sync_race_from_api(race)
                    if sync_result.get("success"):
                        synced_races.append(race["name"])
                        logger.info(f"[Auto-Sync] Successfully synced {race['name']}")
                    else:
                        logger.warning(f"[Auto-Sync] Could not sync {race['name']}: {sync_result.get('error')}")
                except Exception as e:
                    logger.error(f"[Auto-Sync] Error syncing {race['name']}: {e}")

            if synced_races:
                logger.info(f"[Auto-Sync] Completed. Synced races: {', '.join(synced_races)}")
            else:
                logger.info("[Auto-Sync] No new races to sync")

            sleep_seconds = (
                AUTO_SYNC_ACTIVE_INTERVAL_SECONDS
                if active_window_open
                else AUTO_SYNC_INTERVAL_HOURS * 3600
            )
            await asyncio.sleep(sleep_seconds)

        except asyncio.CancelledError:
            logger.info("[Auto-Sync] Background task cancelled")
            break
        except Exception as e:
            logger.error(f"[Auto-Sync] Unexpected error: {e}")
            await asyncio.sleep(300)
