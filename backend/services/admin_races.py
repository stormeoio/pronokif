from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException

from data.f1_data import F1_DRIVERS_2026
from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    championship_id_for_season,
    race_championship_link,
)
from services.race_calendar import (
    ACTIVE_2026_CALENDAR_OVERRIDES,
    predictions_close_at_utc,
    race_temporal_status,
    race_timing_payload,
)

RACE_EDITORIAL_PROFILES = {
    "australia-2026": {
        "track_profile": "Albert Park rewards stable cars on traction and drivers who can manage restarts.",
        "story_angle": "Season opener: compare winter promises with the first real pecking order.",
    },
    "china-2026": {
        "track_profile": "Shanghai mixes long lateral loads, slow hairpins, and front-left tyre wear.",
        "story_angle": "First consistency test: the grid starts revealing which teams really understand their tyres.",
    },
    "japan-2026": {
        "track_profile": "Suzuka is a technical judge: the Esses, Degner, and 130R instantly expose unstable cars.",
        "story_angle": "A pure driving race, perfect for highlighting bold top-10 picks.",
    },
    "bahrain-2026": {
        "track_profile": "Sakhir would have focused on traction, braking, and thermal degradation.",
        "story_angle": "Cancelled race: turn the window into strategy, tyre, and hypothetical duel content.",
        "cancellation_impact": (
            "No scoring or prediction reminder. Use it as an editorial pause to keep the paddock active."
        ),
    },
    "saudi-2026": {
        "track_profile": "Jeddah would have been a pure speed test between walls, with very little margin for error.",
        "story_angle": "Cancelled race: focus on risk, safety cars, and top speed.",
        "cancellation_impact": "No result expected. Good moment to publish a quiz or off-leaderboard bonus prediction.",
    },
    "miami-2026": {
        "track_profile": "Miami combines long straights, heavy braking, and a demanding slow section.",
        "story_angle": "First American stop: watch pace gaps and overtaking ability.",
    },
    "canada-2026": {
        "track_profile": "Montreal is about braking, kerbs, and nearby walls: consistency pays.",
        "story_angle": "An ideal Grand Prix to recap top-10 bets and strategy surprises.",
    },
    "monaco-2026": {
        "track_profile": "Monaco gives maximum value to qualifying and race discipline.",
        "story_angle": "Premium weekend: highlight pole, DRS trains, and strategy moves.",
    },
    "spain-2026": {
        "track_profile": "Barcelona remains an aero benchmark: a complete car shows it here.",
        "story_angle": "A technical readout race to explain upgrades and performance trends.",
    },
    "madrid-2026": {
        "track_profile": "Madrid adds a new calendar reference point, with useful unknowns for predictions.",
        "story_angle": "New for 2026: prepare a discovery brief and ask players for their instincts.",
    },
}


def race_thumbnail_url(race_id: str) -> str:
    return f"/images/races/{race_id}.webp"


def is_race_past(race: dict) -> bool:
    return race_temporal_status(race) == "finished"


def race_doc_from_static(race: dict, round_number: int) -> dict:
    overrides = ACTIVE_2026_CALENDAR_OVERRIDES.get(race["id"], {})
    championship_link = race_championship_link(
        {"season": 2026, **race},
        championship_id=F1_2026_CHAMPIONSHIP_ID,
    )
    race_doc = {
        **race,
        **championship_link,
        "round_number": race.get("round_number") or overrides.get("round_number", round_number),
        "season": 2026,
        "thumbnail_url": race_thumbnail_url(race["id"]),
        "has_results": False,
        "is_past": is_race_past(race),
        "is_cancelled": bool(race.get("is_cancelled")),
        "race_duration_minutes": race.get("race_duration_minutes", 120),
        "is_test_race": bool(race.get("is_test_race", False)),
        "seed_source": "f1_2026",
    }
    race_doc["is_past"] = is_race_past(race_doc)
    return race_doc


def race_editorial_profile(race: dict) -> dict:
    profile = RACE_EDITORIAL_PROFILES.get(race.get("id"), {})
    if profile:
        return profile

    circuit = race.get("circuit") or "this circuit"
    country = race.get("country") or "this event"
    return {
        "track_profile": f"{circuit} is the main readout for understanding {country}: pace, tyres, and overtaking.",
        "story_angle": "Prepare a short brief: favourites, outsider, strategy window, and weekend traps.",
    }


def driver_label(driver_id: str | None) -> str | None:
    if not driver_id:
        return None
    driver = next((driver for driver in F1_DRIVERS_2026 if driver["id"] == driver_id), None)
    if not driver:
        return driver_id
    return f"{driver.get('code') or driver['name']} - {driver['name']}"


def driver_labels(driver_ids: list[str] | None) -> list[str]:
    return [label for driver_id in (driver_ids or []) if (label := driver_label(driver_id))]


def result_digest(result_doc: dict | None) -> dict | None:
    results = (result_doc or {}).get("results") or {}
    if not results:
        return None

    bonus = results.get("bonus") or {}
    return {
        "quali_pole": driver_label(results.get("quali_pole")),
        "quali_top3": driver_labels((results.get("quali_top10") or [])[:3]),
        "race_winner": driver_label(results.get("race_winner")),
        "race_top3": driver_labels((results.get("race_top10") or [])[:3]),
        "fastest_lap": driver_label(bonus.get("fastest_lap")),
        "dnf_count": len(bonus.get("dnf_drivers") or []),
        "safety_car": bool(bonus.get("safety_car")),
        "entered_at": result_doc.get("entered_at") if result_doc else None,
    }


def completion_rate(submitted: int, total: int) -> int:
    if total <= 0:
        return 0
    return min(100, round((submitted / total) * 100))


def default_public_recap(
    race: dict,
    digest: dict | None,
    *,
    submitted: int,
    missing: int,
    total_users: int,
) -> str:
    if race.get("is_cancelled"):
        return (
            race.get("cancellation_impact")
            or race_editorial_profile(race).get("cancellation_impact")
            or (
                "Race cancelled: no points to award, but a good chance to publish analysis content "
                "or a mini-challenge to keep players engaged."
            )
        )

    if digest:
        winner = digest.get("race_winner") or "winner TBC"
        pole = digest.get("quali_pole") or "pole TBC"
        top3 = " / ".join(digest.get("race_top3") or []) or "top 3 TBC"
        return (
            f"Recap available: {winner} wins, {pole} takes pole, podium {top3}. "
            f"{submitted}/{total_users} players submitted picks."
        )

    if race_temporal_status(race) == "finished":
        return (
            "Race finished: official results must be synced before publishing the player recap. "
            f"{submitted}/{total_users} picks are ready to score."
        )

    return (
        "Brief to prepare before the weekend: circuit strengths, favourites, outsider to watch, "
        f"and prediction reminder for {missing} player(s) still pending."
    )


def race_editorial_payload(
    race: dict,
    result_doc: dict | None,
    *,
    submitted: int = 0,
    missing: int = 0,
    total_users: int = 0,
) -> dict:
    profile = race_editorial_profile(race)
    digest = result_digest(result_doc)
    key_info = race.get("key_info") or [
        f"Circuit: {race.get('circuit') or 'to be filled'}",
        f"Country: {race.get('country') or 'to be filled'}",
        "Sprint weekend" if race.get("is_sprint") else "Classic Grand Prix format",
    ]

    return {
        "content_status": race.get("content_status") or ("published" if digest else "draft"),
        "track_profile": race.get("track_profile") or profile["track_profile"],
        "story_angle": race.get("story_angle") or profile["story_angle"],
        "key_info": key_info,
        "public_recap": race.get("public_recap")
        or default_public_recap(
            race,
            digest,
            submitted=submitted,
            missing=missing,
            total_users=total_users,
        ),
        "admin_summary": race.get("admin_summary")
        or (
            f"Prediction coverage: {submitted}/{total_users}, {missing} player(s) to remind."
            if not race.get("is_cancelled")
            else "Reminders and scoring disabled: prioritize editorial content, quiz, or archive."
        ),
        "cancellation_reason": race.get("cancellation_reason")
        or ("Official reason to specify in the back office." if race.get("is_cancelled") else None),
        "cancellation_impact": race.get("cancellation_impact") or profile.get("cancellation_impact"),
        "user_content_idea": race.get("user_content_idea")
        or (
            "Publish a poll: what would the podium have been?"
            if race.get("is_cancelled")
            else "Highlight the most-picked duel and the surprise top-10 driver."
        ),
        "results_digest": digest,
        "prediction_digest": {
            "submitted": submitted,
            "missing": missing,
            "total_users": total_users,
            "completion_rate": completion_rate(submitted, total_users),
        },
    }


def predictions_close_at(race: dict) -> str | None:
    close_at = predictions_close_at_utc(race)
    return close_at.isoformat() if close_at else None


def scoring_coverage_payload(*, submitted: int, scored: int, has_results: bool) -> dict:
    pending = max(submitted - scored, 0) if has_results else 0
    return {
        "scored_predictions": scored,
        "scoring_pending": pending,
        "scoring_coverage_rate": completion_rate(scored, submitted),
        "has_scoring_gaps": bool(has_results and pending > 0),
    }


def race_create_doc(data: Any, *, now: str, actor_email: str | None, race_id: str | None = None) -> dict:
    championship_id = data.championship_id or championship_id_for_season(data.season)
    race = {
        "id": race_id or str(uuid.uuid4()),
        **data.model_dump(),
        **({"championship_id": championship_id, "championship_ids": [championship_id]} if championship_id else {}),
        "timezone": data.timezone or "Europe/Paris",
        "race_time": data.race_time or "15:00",
        "quali_time": data.quali_time or "14:00",
        "race_duration_minutes": data.race_duration_minutes or 120,
        "is_past": False,
        "has_results": False,
        "created_at": now,
        "updated_at": now,
        "created_by": actor_email,
    }
    race.update(race_timing_payload(race))
    return race


def race_update_payload(data: Any, *, now: str, actor_email: str | None) -> dict:
    updates = {key: value for key, value in data.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    if "championship_id" in updates:
        updates["championship_ids"] = [updates["championship_id"]] if updates["championship_id"] else []
    elif "season" in updates:
        default_championship_id = championship_id_for_season(updates["season"])
        if default_championship_id:
            updates["championship_id"] = default_championship_id
            updates["championship_ids"] = [default_championship_id]
    updates["updated_at"] = now
    updates["updated_by"] = actor_email
    return updates
