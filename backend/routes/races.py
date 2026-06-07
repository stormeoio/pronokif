"""
PRONOKIF - Race & Driver Routes
/races/*, /drivers/* endpoints for F1 data
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from config import db
from data.f1_data import F1_CIRCUITS, F1_DRIVERS_2026
from models.schemas import DriverResponse, RaceResponse
from services.auth import get_current_user
from services.championships import with_championship_link
from services.circuit_maps import get_effective_circuit_image_url, get_effective_circuit_map
from services.race_calendar import (
    active_2026_races,
    has_complete_race_results,
    predictions_close_at_utc,
    race_timing_payload,
    race_with_circuit_timezone,
    session_at_utc,
    sprint_predictions_close_at_utc,
)

router = APIRouter(tags=["Races & Drivers"])


# ==================== HELPER FUNCTIONS ====================


def get_predictions_close_time(race: dict) -> datetime:
    """Get the time when main race predictions close (15 min before Q1)"""
    close_at = predictions_close_at_utc(race)
    if close_at is None:
        raise ValueError(f"Invalid qualifying schedule for {race.get('id')}")
    return close_at


def get_sprint_predictions_close_time(race: dict):
    """Get the time when sprint predictions close (15 min before SQ1)"""
    return sprint_predictions_close_at_utc(race)


def _session_datetime(race: dict, date_key: str, time_key: str) -> str | None:
    session_at = session_at_utc(race, date_key, time_key)
    return session_at.isoformat() if session_at else None


async def _calendar_races() -> list[dict]:
    races = await db.races.find({"season": 2026}, {"_id": 0}).sort("date", 1).to_list(200)
    return [
        with_championship_link(race_with_circuit_timezone(race))
        for race in (races or active_2026_races())
    ]


async def _find_calendar_race(race_id: str) -> dict | None:
    race = await db.races.find_one({"id": race_id}, {"_id": 0})
    if race:
        return with_championship_link(race_with_circuit_timezone(race))
    static_race = next((r for r in active_2026_races() if r["id"] == race_id), None)
    return with_championship_link(static_race) if static_race else None


async def _race_result_doc(race_id: str) -> dict | None:
    return await db.race_results.find_one({"race_id": race_id}, {"_id": 0})


def _race_response_payload(race: dict, result_doc: dict | None, now: datetime) -> dict:
    has_results = has_complete_race_results(result_doc)
    timing = race_timing_payload(race, now=now, has_results=has_results)
    visible_results = has_results and timing["status"] == "finished"
    start_at = timing["race_start_at"]
    quali_at = session_at_utc(race, "quali_date", "quali_time", default_time="14:00")
    fp1_at = session_at_utc(race, "fp1_date", "fp1_time")
    is_sprint_weekend = bool(race.get("is_sprint_weekend") or race.get("is_sprint"))

    response = {
        "id": race["id"],
        "name": race.get("name", "Course"),
        "championship_id": race.get("championship_id"),
        "season": race.get("season"),
        "circuit": race.get("circuit") or "Circuit a definir",
        "country": race.get("country") or "",
        "date": start_at or str(race.get("date", "")),
        "quali_date": quali_at.isoformat() if quali_at else start_at or str(race.get("quali_date") or race.get("date", "")),
        "fp1_date": fp1_at.isoformat() if fp1_at else None,
        "fp1_time": race.get("fp1_time"),
        "predictions_close_at": timing["predictions_close_at"] or start_at or datetime.now(UTC).isoformat(),
        "sprint_predictions_close_at": timing["sprint_predictions_close_at"],
        "status": timing["status"],
        "can_predict": (
            bool(timing["predictions_close_at"])
            and now < datetime.fromisoformat(timing["predictions_close_at"])
            and not race.get("is_cancelled")
        ),
        "can_predict_sprint": (
            bool(timing["sprint_predictions_close_at"])
            and now < datetime.fromisoformat(timing["sprint_predictions_close_at"])
            and not race.get("is_cancelled")
        ),
        "is_sprint_weekend": is_sprint_weekend,
        "results": result_doc.get("results") if result_doc and visible_results else None,
        "race_time": race.get("race_time", "15:00"),
        "quali_time": race.get("quali_time", "14:00"),
        "sprint_quali_time": race.get("sprint_quali_time"),
        "sprint_race_time": race.get("sprint_race_time"),
        "timezone": race.get("timezone", "Europe/Paris"),
        "race_start_at": timing["race_start_at"],
        "race_end_at": timing["race_end_at"],
        "race_duration_minutes": timing["race_duration_minutes"],
        "is_test_race": bool(race.get("is_test_race")),
        "thumbnail_url": race.get("thumbnail_url") or race.get("image_url"),
        "is_cancelled": bool(race.get("is_cancelled")),
    }

    if is_sprint_weekend:
        sprint_quali_at = session_at_utc(
            race,
            "sprint_quali_date",
            "sprint_quali_time",
            default_time="10:30",
        )
        sprint_race_at = session_at_utc(
            race,
            "sprint_race_date",
            "sprint_race_time",
            default_time="14:00",
        )
        response["sprint_quali_date"] = sprint_quali_at.isoformat() if sprint_quali_at else None
        response["sprint_race_date"] = sprint_race_at.isoformat() if sprint_race_at else None

    return response


def _race_sessions(race: dict) -> list[dict]:
    session_specs = [
        ("FP1", "Essais Libres 1", "fp1_date", "fp1_time"),
    ]
    if race.get("is_sprint"):
        session_specs.extend(
            [
                ("SQ", "Qualifications Sprint", "sprint_quali_date", "sprint_quali_time"),
                ("SPRINT", "Sprint", "sprint_race_date", "sprint_race_time"),
            ]
        )
    else:
        session_specs.extend(
            [
                ("FP2", "Essais Libres 2", "fp2_date", "fp2_time"),
                ("FP3", "Essais Libres 3", "fp3_date", "fp3_time"),
            ]
        )
    session_specs.extend(
        [
            ("QUALI", "Qualifications", "quali_date", "quali_time"),
            ("COURSE", "Course", "date", "race_time"),
        ]
    )

    sessions = []
    for short_name, name, date_key, time_key in session_specs:
        dt = _session_datetime(race, date_key, time_key)
        if not dt:
            continue
        sessions.append(
            {
                "name": name,
                "short_name": short_name,
                "datetime": dt,
                "date": race.get(date_key),
                "time": race.get(time_key),
            }
        )
    return sorted(sessions, key=lambda session: session["datetime"])


# ==================== DRIVER ENDPOINTS ====================


@router.get("/drivers", response_model=list[DriverResponse])
async def get_drivers():
    """Get all F1 drivers for 2026 season"""
    return [DriverResponse(**d) for d in F1_DRIVERS_2026]


@router.get("/drivers/{driver_id}")
async def get_driver(driver_id: str) -> dict:
    """Get a specific driver's info"""
    driver = next((d for d in F1_DRIVERS_2026 if d["id"] == driver_id), None)
    if not driver:
        raise HTTPException(status_code=404, detail="Pilote introuvable")
    return driver


# ==================== RACE ENDPOINTS ====================


@router.get("/races", response_model=list[RaceResponse])
async def get_races():
    """Get all races for 2026 season"""
    now = datetime.now(UTC)
    responses = []
    for race in await _calendar_races():
        result_doc = await _race_result_doc(race["id"])
        responses.append(RaceResponse(**_race_response_payload(race, result_doc, now)))
    return responses


@router.get("/races/next", response_model=RaceResponse)
async def get_next_race():
    """Get the next upcoming race"""
    now = datetime.now(UTC)

    last_payload = None
    for race in await _calendar_races():
        result_doc = await _race_result_doc(race["id"])
        payload = _race_response_payload(race, result_doc, now)
        last_payload = payload
        if payload["status"] in {"upcoming", "in_progress"}:
            return RaceResponse(**payload)

    if last_payload:
        return RaceResponse(**last_payload)
    raise HTTPException(status_code=404, detail="Course introuvable")


@router.get("/races/upcoming")
async def get_upcoming_races() -> list[dict]:
    """Get all upcoming races for the season (for predictions calendar)"""
    now = datetime.now(UTC)
    upcoming = []

    for race in await _calendar_races():
        result_doc = await _race_result_doc(race["id"])
        upcoming.append(_race_response_payload(race, result_doc, now))

    return upcoming


@router.get("/races/{race_id}")
async def get_race(race_id: str) -> dict:
    """Get detailed info for a specific race"""
    race = await _find_calendar_race(race_id)
    if race:
        now = datetime.now(UTC)
        result_doc = await _race_result_doc(race_id)
        return _race_response_payload(race, result_doc, now)
    raise HTTPException(status_code=404, detail="Course introuvable")


@router.get("/races/{race_id}/details")
async def get_race_details(race_id: str) -> dict:
    """Get detailed information for a specific race including circuit info and session times"""
    race = await _find_calendar_race(race_id)
    if race:
        now = datetime.now(UTC)
        result_doc = await _race_result_doc(race_id)
        has_results = has_complete_race_results(result_doc)
        timing = race_timing_payload(race, now=now, has_results=has_results)
        circuit_name = race.get("circuit") or "Circuit a definir"
        circuit_info = F1_CIRCUITS.get(circuit_name, {})
        circuit_map = await get_effective_circuit_map(circuit_name)
        circuit = {
            "name": circuit_name,
            "full_name": circuit_info.get("full_name", circuit_name),
            "length_km": circuit_info.get("length_km"),
            "turns": circuit_info.get("turns"),
            "laps": circuit_info.get("laps"),
            "map_status": "interactive_seeded" if circuit_map else "static_fallback",
            "map_image_url": await get_effective_circuit_image_url(circuit_name),
        }

        return {
            "id": race["id"],
            "name": race.get("name", "Course"),
            "championship_id": race.get("championship_id"),
            "season": race.get("season"),
            "circuit": circuit,
            "circuit_name": circuit_name,
            "circuit_full_name": circuit["full_name"],
            "circuit_length_km": circuit["length_km"],
            "circuit_turns": circuit["turns"],
            "circuit_laps": circuit["laps"],
            "circuit_map": circuit_map,
            "country": race.get("country") or "",
            "status": timing["status"],
            "is_sprint_weekend": bool(race.get("is_sprint_weekend") or race.get("is_sprint")),
            "timezone": race.get("timezone", "Europe/Paris"),
            "race_start_at": timing["race_start_at"],
            "race_end_at": timing["race_end_at"],
            "race_duration_minutes": timing["race_duration_minutes"],
            "sessions": _race_sessions(race),
        }

    raise HTTPException(status_code=404, detail="Course introuvable")


@router.get("/races/{race_id}/prediction-count")
async def get_race_prediction_count(race_id: str, _user: dict = Depends(get_current_user)) -> dict:
    """Return how many users have submitted predictions for a race (social proof)."""
    count = await db.predictions.count_documents({"race_id": race_id})
    return {"count": count}


@router.get("/races/{race_id}/qualifying-grid")
async def get_qualifying_grid(race_id: str) -> dict:
    """Return the qualifying grid for a race (P1→P20 driver IDs), 404 if not entered yet."""
    race = await _find_calendar_race(race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")
    grid = await db.qualifying_grids.find_one({"race_id": race_id}, {"_id": 0})
    if not grid:
        raise HTTPException(status_code=404, detail="Grille de départ non disponible")
    return grid
