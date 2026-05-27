"""
PRONOKIF - Sync service (S1 lot 7).

User-facing sync functions:
* ``sync_one_race(race_id, user_id)`` -- fetch results (no DB write).
* ``auto_sync_and_save(race_id, user_id)`` -- fetch + persist + score.

Background/admin operations are in ``services/sync_background.py``:
* ``sync_race_from_api``, ``sync_all_pending``, ``sync_status``,
  ``send_reminders``, ``auto_sync_loop``.

Custom exceptions:
* ``RaceNotFoundError`` -- race_id does not match the 2026 calendar.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx

from config import JOLPICA_API, OPENF1_API, db, logger
from data.f1_data import F1_DRIVERS_2026
from services.auth import send_user_notification
from services.race_calendar import syncable_2026_races
from services.scoring import calculate_points

AUTO_SYNC_INTERVAL_HOURS = 1
DNF_STATUSES = [
    "Accident",
    "Collision",
    "Engine",
    "Gearbox",
    "Hydraulics",
    "Brakes",
    "Suspension",
    "Electrical",
    "Retired",
    "Mechanical",
    "Power Unit",
    "Oil leak",
    "Water leak",
    "Overheating",
    "Spun off",
]


class RaceNotFoundError(Exception):
    """Raised when a race_id does not match the 2026 calendar."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _find_race(race_id: str) -> dict:
    race = next((r for r in syncable_2026_races() if r["id"] == race_id), None)
    if not race:
        raise RaceNotFoundError(race_id)
    return race


def _number_to_id_map() -> dict:
    return {d["number"]: d["id"] for d in F1_DRIVERS_2026}


def _extract_driver_ids(
    results: list[dict], number_to_id: dict, *, limit: int | None = None
) -> list[str]:
    """Convert Jolpica results to a list of internal driver IDs."""
    entries = results[:limit] if limit else results
    ids: list[str] = []
    for result in entries:
        d_num = result.get("Driver", {}).get("permanentNumber")
        if d_num:
            did = number_to_id.get(int(d_num))
            if did:
                ids.append(did)
    return ids


async def _resolve_round(
    client: httpx.AsyncClient, race: dict, year: str
) -> tuple[str | None, list]:
    """Return (round_number, races_list) by querying the Jolpica schedule."""
    schedule_resp = await client.get(f"{JOLPICA_API}/{year}.json")
    if schedule_resp.status_code != 200:
        return None, []
    races_list = (
        schedule_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [])
    )
    circuit_name = race.get("circuit", "").lower()
    race_date = race.get("date", "")
    race_name = race.get("name", "").lower().replace("grand prix", "").strip()

    for r in races_list:
        r_circuit = r.get("Circuit", {}).get("circuitId", "").lower()
        r_date = r.get("date", "")
        if (
            race_date == r_date
            or circuit_name in r_circuit
            or r_circuit in circuit_name
        ):
            return r.get("round"), races_list
    for r in races_list:
        r_name = r.get("raceName", "").lower().replace("grand prix", "").strip()
        if race_name and (race_name in r_name or r_name in race_name):
            return r.get("round"), races_list
    return None, races_list


# ---------------------------------------------------------------------------
# API fetch helpers (shared by sync_one_race & auto_sync_and_save)
# ---------------------------------------------------------------------------


async def _fetch_qualifying(
    client: httpx.AsyncClient,
    year: str,
    round_number: str,
    number_to_id: dict,
) -> tuple[str | None, list[str]]:
    """Fetch qualifying. Returns ``(pole_driver_id, top10_ids)``."""
    resp = await client.get(
        f"{JOLPICA_API}/{year}/{round_number}/qualifying.json"
    )
    if resp.status_code != 200:
        return None, []
    quali = (
        resp.json()
        .get("MRData", {})
        .get("RaceTable", {})
        .get("Races", [{}])[0]
        .get("QualifyingResults", [])
    )
    if not quali:
        return None, []

    pole = None
    pole_num = quali[0].get("Driver", {}).get("permanentNumber")
    if pole_num:
        pole = number_to_id.get(int(pole_num))

    return pole, _extract_driver_ids(quali, number_to_id, limit=10)


async def _fetch_race_results(
    client: httpx.AsyncClient,
    year: str,
    round_number: str,
    number_to_id: dict,
) -> tuple[str | None, list[str], list[str], str | None]:
    """Fetch race results. Returns ``(winner, top10, dnf_drivers, fastest_lap)``."""
    resp = await client.get(
        f"{JOLPICA_API}/{year}/{round_number}/results.json"
    )
    if resp.status_code != 200:
        return None, [], [], None

    results = (
        resp.json()
        .get("MRData", {})
        .get("RaceTable", {})
        .get("Races", [{}])[0]
        .get("Results", [])
    )
    if not results:
        return None, [], [], None

    winner = None
    winner_num = results[0].get("Driver", {}).get("permanentNumber")
    if winner_num:
        winner = number_to_id.get(int(winner_num))

    top10 = _extract_driver_ids(results, number_to_id, limit=10)

    dnf_drivers: list[str] = []
    for result in results:
        status = result.get("status", "")
        if any(dnf in status for dnf in DNF_STATUSES):
            d_num = result.get("Driver", {}).get("permanentNumber")
            if d_num:
                did = number_to_id.get(int(d_num))
                if did:
                    dnf_drivers.append(did)

    fastest_lap = None
    for result in results:
        if result.get("FastestLap", {}).get("rank") == "1":
            d_num = result.get("Driver", {}).get("permanentNumber")
            if d_num:
                fastest_lap = number_to_id.get(int(d_num))
            break

    return winner, top10, dnf_drivers, fastest_lap


async def _fetch_sprint(
    client: httpx.AsyncClient,
    year: str,
    round_number: str,
    number_to_id: dict,
) -> tuple[str | None, list[str]]:
    """Fetch sprint results. Returns ``(winner, top10)``."""
    resp = await client.get(
        f"{JOLPICA_API}/{year}/{round_number}/sprint.json"
    )
    if resp.status_code != 200:
        return None, []
    sprint = (
        resp.json()
        .get("MRData", {})
        .get("RaceTable", {})
        .get("Races", [{}])[0]
        .get("SprintResults", [])
    )
    if not sprint:
        return None, []

    winner = None
    sw_num = sprint[0].get("Driver", {}).get("permanentNumber")
    if sw_num:
        winner = number_to_id.get(int(sw_num))

    return winner, _extract_driver_ids(sprint, number_to_id, limit=10)


async def _fetch_openf1_data(
    client: httpx.AsyncClient,
    year: str,
    race: dict,
    number_to_id: dict,
) -> dict[str, Any]:
    """Fetch OpenF1 bonus data (safety car, first corner leader, sprint FCL).

    Returns a dict with keys ``safety_car``, ``first_corner_leader``,
    ``sprint_first_corner_leader``.
    """
    result: dict[str, Any] = {
        "safety_car": None,
        "first_corner_leader": None,
        "sprint_first_corner_leader": None,
    }

    meetings_resp = await client.get(
        f"{OPENF1_API}/meetings", params={"year": int(year)}
    )
    if meetings_resp.status_code != 200:
        return result

    meetings = meetings_resp.json()
    circuit_name = race.get("circuit", "").lower()
    race_name = race.get("name", "").lower()

    meeting = None
    for m in meetings:
        m_name = (
            m.get("meeting_name", "") + " " + m.get("circuit_short_name", "")
        ).lower()
        if any(
            word in m_name for word in circuit_name.split()[:2]
        ) or any(
            word in m_name
            for word in race_name.replace("grand prix", "").split()[:2]
        ):
            meeting = m
            break

    if not meeting:
        return result

    meeting_key = meeting.get("meeting_key")
    sessions_resp = await client.get(
        f"{OPENF1_API}/sessions", params={"meeting_key": meeting_key}
    )
    if sessions_resp.status_code != 200:
        return result

    sessions = sessions_resp.json()
    race_session = next(
        (s for s in sessions if s.get("session_name") == "Race"), None
    )
    sprint_session = next(
        (s for s in sessions if s.get("session_name") == "Sprint"), None
    )

    if race_session:
        session_key = race_session.get("session_key")

        # Safety car
        rc_resp = await client.get(
            f"{OPENF1_API}/race_control",
            params={"session_key": session_key},
        )
        if rc_resp.status_code == 200:
            for msg in rc_resp.json():
                category = msg.get("category", "").lower()
                message = msg.get("message", "").lower()
                if (
                    "safety car" in category
                    or "safety car" in message
                    or "safetycar" in message
                ):
                    result["safety_car"] = True
                    break
            if result["safety_car"] is None:
                result["safety_car"] = False

        # First corner leader (second P1 entry = post-start leader)
        pos_resp = await client.get(
            f"{OPENF1_API}/position",
            params={"session_key": session_key},
        )
        if pos_resp.status_code == 200:
            p1_positions = [
                p for p in pos_resp.json() if p.get("position") == 1
            ]
            if len(p1_positions) > 1:
                fcl_num = p1_positions[1].get("driver_number")
                if fcl_num:
                    result["first_corner_leader"] = number_to_id.get(fcl_num)

    if sprint_session:
        session_key = sprint_session.get("session_key")
        pos_resp = await client.get(
            f"{OPENF1_API}/position",
            params={"session_key": session_key},
        )
        if pos_resp.status_code == 200:
            p1_positions = [
                p for p in pos_resp.json() if p.get("position") == 1
            ]
            if len(p1_positions) > 1:
                sl_num = p1_positions[1].get("driver_number")
                if sl_num:
                    result["sprint_first_corner_leader"] = number_to_id.get(
                        sl_num
                    )

    return result


def _build_success_items(fetched_data: dict) -> list[str]:
    """Build a human-readable list of successfully fetched data points."""
    items: list[str] = []
    if fetched_data.get("quali_pole"):
        items.append("Pole position")
    if len(fetched_data.get("quali_top10", [])) == 10:
        items.append("Top 10 qualifs")
    if fetched_data.get("race_winner"):
        items.append("Vainqueur course")
    if len(fetched_data.get("race_top10", [])) == 10:
        items.append("Top 10 course")

    bonus = fetched_data.get("bonus", {})
    if bonus.get("fastest_lap"):
        items.append("Meilleur tour")
    if bonus.get("safety_car") is not None:
        items.append(
            f"Safety Car: {'OUI' if bonus['safety_car'] else 'NON'}"
        )
    if bonus.get("dnf_drivers"):
        items.append(f"DNF: {len(bonus['dnf_drivers'])} pilotes")
    if bonus.get("first_corner_leader"):
        items.append("Leader 1er virage")
    if fetched_data.get("sprint_race_winner"):
        items.append("Vainqueur sprint")
    return items


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def sync_one_race(race_id: str, user_id: str) -> dict:
    """Fetch quali / race / sprint / safety car / fastest lap from external APIs.

    Does NOT save to the database. Mirrors the legacy POST
    ``/admin/sync-results/{race_id}`` endpoint behaviour.
    """
    race = _find_race(race_id)
    year = (race.get("date") or "2026").split("-")[0]
    number_to_id = _number_to_id_map()

    fetched_data: dict[str, Any] = {
        "quali_pole": None,
        "quali_top10": [],
        "sprint_quali_pole": None,
        "sprint_quali_top10": [],
        "sprint_race_winner": None,
        "sprint_race_top10": [],
        "race_winner": None,
        "race_top10": [],
        "bonus": {
            "safety_car": None,
            "dnf_drivers": [],
            "fastest_lap": None,
            "first_corner_leader": None,
            "sprint_first_corner_leader": None,
        },
    }
    errors: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            round_number, _ = await _resolve_round(client, race, year)

            if not round_number:
                errors.append(
                    f"Could not find round number for {race.get('name')}"
                )
            else:
                try:
                    pole, top10 = await _fetch_qualifying(
                        client, year, round_number, number_to_id
                    )
                    fetched_data["quali_pole"] = pole
                    fetched_data["quali_top10"] = top10
                except Exception as e:
                    errors.append(f"Qualifying: {e}")

                try:
                    winner, top10, dnfs, fl = await _fetch_race_results(
                        client, year, round_number, number_to_id
                    )
                    fetched_data["race_winner"] = winner
                    fetched_data["race_top10"] = top10
                    fetched_data["bonus"]["dnf_drivers"] = dnfs
                    fetched_data["bonus"]["fastest_lap"] = fl
                except Exception as e:
                    errors.append(f"Race: {e}")

                if race.get("is_sprint"):
                    try:
                        sw, stop10 = await _fetch_sprint(
                            client, year, round_number, number_to_id
                        )
                        fetched_data["sprint_race_winner"] = sw
                        fetched_data["sprint_race_top10"] = stop10
                    except Exception as e:
                        errors.append(f"Sprint: {e}")

            try:
                of1 = await _fetch_openf1_data(
                    client, year, race, number_to_id
                )
                fetched_data["bonus"]["safety_car"] = of1["safety_car"]
                fetched_data["bonus"]["first_corner_leader"] = of1[
                    "first_corner_leader"
                ]
                fetched_data["bonus"]["sprint_first_corner_leader"] = of1[
                    "sprint_first_corner_leader"
                ]
            except Exception as e:
                errors.append(f"OpenF1 data: {e}")

    except Exception as e:
        logger.error(f"API sync error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "manual_entry_required": True,
        }

    success_items = _build_success_items(fetched_data)

    return {
        "status": "success" if success_items else "partial",
        "fetched_data": fetched_data,
        "success_items": success_items,
        "errors": errors,
        "message": f"Recupere: {', '.join(success_items) if success_items else 'Aucune donnee'}",
    }


async def auto_sync_and_save(race_id: str, user_id: str) -> dict:
    """Sync a race and persist results + recompute predictions + notify users."""
    race = _find_race(race_id)
    year = (race.get("date") or "2026").split("-")[0]
    number_to_id = _number_to_id_map()

    fetched_data: dict[str, Any] = {
        "quali_pole": None,
        "quali_top10": [],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": None,
        "race_top10": [],
        "bonus": {
            "safety_car": None,
            "dnf_drivers": [],
            "fastest_lap": None,
            "first_corner_leader": None,
        },
    }
    errors: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            round_number, _ = await _resolve_round(client, race, year)
            if not round_number:
                return {
                    "status": "error",
                    "message": f"Could not find round number for {race.get('name')}",
                    "errors": ["Round not found"],
                }

            try:
                pole, top10 = await _fetch_qualifying(
                    client, year, round_number, number_to_id
                )
                fetched_data["quali_pole"] = pole
                fetched_data["quali_top10"] = top10
            except Exception as e:
                errors.append(f"Qualifying: {e}")

            try:
                winner, top10, dnfs, fl = await _fetch_race_results(
                    client, year, round_number, number_to_id
                )
                fetched_data["race_winner"] = winner
                fetched_data["race_top10"] = top10
                fetched_data["bonus"]["dnf_drivers"] = dnfs
                fetched_data["bonus"]["fastest_lap"] = fl
            except Exception as e:
                errors.append(f"Race: {e}")

            if race.get("is_sprint"):
                try:
                    _, stop10 = await _fetch_sprint(
                        client, year, round_number, number_to_id
                    )
                    fetched_data["sprint_race_top10"] = stop10
                except Exception as e:
                    errors.append(f"Sprint: {e}")

            try:
                of1 = await _fetch_openf1_data(
                    client, year, race, number_to_id
                )
                fetched_data["bonus"]["safety_car"] = of1["safety_car"]
                fetched_data["bonus"]["first_corner_leader"] = of1[
                    "first_corner_leader"
                ]
            except Exception as e:
                errors.append(f"OpenF1: {e}")

    except Exception as e:
        return {"status": "error", "message": str(e), "errors": [str(e)]}

    if fetched_data["race_winner"] or len(fetched_data["race_top10"]) > 0:
        results = {
            "quali_pole": fetched_data["quali_pole"],
            "quali_top10": fetched_data["quali_top10"],
            "sprint_quali_top10": fetched_data["sprint_quali_top10"],
            "sprint_race_top10": fetched_data["sprint_race_top10"],
            "race_winner": fetched_data["race_winner"],
            "race_top10": fetched_data["race_top10"],
            "bonus": fetched_data["bonus"],
        }

        await db.race_results.update_one(
            {"race_id": race_id},
            {
                "$set": {
                    "race_id": race_id,
                    "results": results,
                    "entered_by": user_id,
                    "entered_at": datetime.now(UTC).isoformat(),
                    "auto_synced": True,
                }
            },
            upsert=True,
        )

        predictions = await db.predictions.find(
            {"race_id": race_id}, {"_id": 0}
        ).to_list(1000)
        points_calculated = 0
        for pred in predictions:
            points = calculate_points(pred, results)
            await db.users.update_one(
                {"id": pred["user_id"]},
                {"$inc": {"xp": points["xp_earned"]}},
            )

            user_data = await db.users.find_one(
                {"id": pred["user_id"]}, {"_id": 0}
            )
            if user_data:
                new_xp = user_data.get("xp", 0) + points["xp_earned"]
                new_level = (new_xp // 100) + 1
                if new_level > user_data.get("level", 1):
                    await db.users.update_one(
                        {"id": pred["user_id"]},
                        {"$set": {"level": new_level}},
                    )
                    await send_user_notification(
                        pred["user_id"],
                        f"Niveau {new_level} atteint !",
                        "level_up",
                    )

                await send_user_notification(
                    pred["user_id"],
                    f"Resultats {race['name']}: +{points['total']} pts!",
                    "results",
                )
                points_calculated += 1

        success_items = _build_success_items(fetched_data)

        return {
            "status": "success",
            "message": (
                f"Resultats synchronises et sauvegardes! "
                f"{points_calculated} pronostics calcules."
            ),
            "fetched_data": fetched_data,
            "success_items": success_items,
            "errors": errors,
            "points_calculated": points_calculated,
        }

    return {
        "status": "partial",
        "message": "Donnees recuperees mais aucun vainqueur trouve. Resultats non sauvegardes.",
        "fetched_data": fetched_data,
        "errors": errors,
    }


# Re-export background functions for backward compatibility
from services.sync_background import (  # noqa: E402, F401
    auto_sync_loop,
    send_reminders,
    sync_all_pending,
    sync_race_from_api,
    sync_status,
)
