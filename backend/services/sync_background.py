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

import httpx

from config import JOLPICA_API, db, logger
from data.f1_data import F1_DRIVERS_2026, F1_RACES_2026
from services.auth import send_user_notification
from services.scoring import calculate_points

AUTO_SYNC_INTERVAL_HOURS = 1


def _number_to_id_map() -> dict:
    return {d["number"]: d["id"] for d in F1_DRIVERS_2026}


async def sync_race_from_api(race: dict) -> dict:
    """Background-friendly variant: fetch + persist + score for a single race.

    Used by the auto-sync loop and by ``sync_all_pending``. Returns
    ``{"success": bool, "winner"/"error": ...}``.
    """
    race_id = race["id"]
    race_date = race.get("date", "")
    year = race_date.split("-")[0] if race_date else "2026"
    number_to_id = _number_to_id_map()

    fetched_data: dict[str, Any] = {
        "quali_pole": None,
        "quali_top10": [],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": None,
        "race_top10": [],
        "bonus": {"safety_car": None, "dnf_drivers": [], "fastest_lap": None, "first_corner_leader": None},
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            schedule_resp = await client.get(f"{JOLPICA_API}/{year}.json")
            round_number = None
            if schedule_resp.status_code == 200:
                races_list = schedule_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [])
                circuit_name = race.get("circuit", "").lower()
                race_name = race.get("name", "").lower().replace("grand prix", "").strip()
                for r in races_list:
                    r_circuit = r.get("Circuit", {}).get("circuitId", "").lower()
                    r_name = r.get("raceName", "").lower().replace("grand prix", "").strip()
                    if race_date == r.get("date", "") or circuit_name in r_circuit or race_name in r_name:
                        round_number = r.get("round")
                        break

            if not round_number:
                return {"success": False, "error": "Round not found"}

            quali_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/qualifying.json")
            if quali_resp.status_code == 200:
                quali_results = (
                    quali_resp.json()
                    .get("MRData", {})
                    .get("RaceTable", {})
                    .get("Races", [{}])[0]
                    .get("QualifyingResults", [])
                )
                if quali_results:
                    pole_num = quali_results[0].get("Driver", {}).get("permanentNumber")
                    if pole_num:
                        fetched_data["quali_pole"] = number_to_id.get(int(pole_num))
                    for result in quali_results[:10]:
                        d_num = result.get("Driver", {}).get("permanentNumber")
                        if d_num and number_to_id.get(int(d_num)):
                            fetched_data["quali_top10"].append(number_to_id.get(int(d_num)))

            race_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/results.json")
            if race_resp.status_code == 200:
                race_results = (
                    race_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("Results", [])
                )
                if race_results:
                    winner_num = race_results[0].get("Driver", {}).get("permanentNumber")
                    if winner_num:
                        fetched_data["race_winner"] = number_to_id.get(int(winner_num))
                    for result in race_results[:10]:
                        d_num = result.get("Driver", {}).get("permanentNumber")
                        if d_num and number_to_id.get(int(d_num)):
                            fetched_data["race_top10"].append(number_to_id.get(int(d_num)))
                    short_dnf = ["Accident", "Collision", "Engine", "Gearbox", "Hydraulics", "Retired", "Mechanical"]
                    for result in race_results:
                        if any(s in result.get("status", "") for s in short_dnf):
                            d_num = result.get("Driver", {}).get("permanentNumber")
                            if d_num and number_to_id.get(int(d_num)):
                                fetched_data["bonus"]["dnf_drivers"].append(number_to_id.get(int(d_num)))
                        if result.get("FastestLap", {}).get("rank") == "1":
                            d_num = result.get("Driver", {}).get("permanentNumber")
                            if d_num:
                                fetched_data["bonus"]["fastest_lap"] = number_to_id.get(int(d_num))

        if fetched_data["race_winner"]:
            await db.race_results.update_one(
                {"race_id": race_id},
                {
                    "$set": {
                        "race_id": race_id,
                        "results": fetched_data,
                        "entered_at": datetime.now(UTC).isoformat(),
                        "auto_synced": True,
                    }
                },
                upsert=True,
            )

            predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
            for pred in predictions:
                try:
                    points = calculate_points(pred, fetched_data)
                    await db.users.update_one({"id": pred["user_id"]}, {"$inc": {"xp": points["xp_earned"]}})
                    await send_user_notification(
                        pred["user_id"], f"Résultats {race['name']}: +{points['total']} pts!", "results"
                    )
                    leagues = await db.leagues.find({"members": pred["user_id"]}, {"_id": 0}).to_list(100)
                    for league in leagues:
                        entry = await db.leaderboard.find_one({"league_id": league["id"], "user_id": pred["user_id"]})
                        if entry:
                            all_entries = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
                            all_entries.sort(key=lambda x: x.get("total_points", 0), reverse=True)
                            current_pos = next(
                                (i + 1 for i, e in enumerate(all_entries) if e["user_id"] == pred["user_id"]),
                                len(all_entries),
                            )
                            await db.leaderboard.update_one(
                                {"id": entry["id"]},
                                {
                                    "$inc": {"total_points": points["total"]},
                                    "$set": {"last_race_points": points["total"], "previous_position": current_pos},
                                },
                            )
                except Exception:
                    pass

            await db.predictions.update_many({"race_id": race_id}, {"$set": {"locked": True}})
            return {"success": True, "winner": fetched_data["race_winner"]}

        return {"success": False, "error": "No winner found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def sync_all_pending() -> dict:
    """Sync every past race that does not yet have results stored."""
    now = datetime.now(UTC)
    synced: list[dict] = []
    failed: list[dict] = []

    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T18:00:00+00:00")
        if now > race_date:
            result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
            has_results = result_doc and result_doc.get("results", {}).get("race_winner")
            if not has_results:
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

    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        has_results = result_doc and result_doc.get("results", {}).get("race_winner")

        status = "upcoming"
        if has_results:
            status = "synced"
        elif now > race_date:
            status = "pending_sync"

        races_status.append(
            {
                "id": race["id"],
                "name": race["name"],
                "date": race["date"],
                "status": status,
                "has_results": has_results,
                "auto_synced": result_doc.get("auto_synced", False) if result_doc else False,
            }
        )

    return {
        "auto_sync_enabled": True,
        "sync_interval_hours": AUTO_SYNC_INTERVAL_HOURS,
        "races": races_status,
        "summary": {
            "synced": len([r for r in races_status if r["status"] == "synced"]),
            "pending": len([r for r in races_status if r["status"] == "pending_sync"]),
            "upcoming": len([r for r in races_status if r["status"] == "upcoming"]),
        },
    }


async def send_reminders() -> dict:
    """Notify users who have not pronostiqued for a race closing in ~24h."""
    now = datetime.now(UTC)
    notifications_sent = 0

    for race in F1_RACES_2026:
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
                        u["id"], f"Rappel: Pronos {race['name']} ferment dans 24h!", "reminder"
                    )
                    notifications_sent += 1

    return {"message": f"{notifications_sent} reminders sent"}


async def auto_sync_loop() -> None:
    """Background coroutine: every hour, sync past races missing results.

    Owns its own retry-on-error sleep (5 min) and respects ``CancelledError``
    so the FastAPI shutdown hook can stop it cleanly.
    """
    while True:
        try:
            await asyncio.sleep(AUTO_SYNC_INTERVAL_HOURS * 3600)

            now = datetime.now(UTC)
            logger.info(f"[Auto-Sync] Starting automatic results synchronization at {now.isoformat()}")

            synced_races: list[str] = []
            for race in F1_RACES_2026:
                race_date = datetime.fromisoformat(race["date"] + "T18:00:00+00:00")
                if now > race_date:
                    result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
                    has_results = result_doc and result_doc.get("results", {}).get("race_winner")
                    if not has_results:
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

        except asyncio.CancelledError:
            logger.info("[Auto-Sync] Background task cancelled")
            break
        except Exception as e:
            logger.error(f"[Auto-Sync] Unexpected error: {e}")
            await asyncio.sleep(300)
