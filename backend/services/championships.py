"""
Championship helpers.

The canonical F1 2026 championship uses stable, language-neutral IDs and keeps
legacy display fields (`name`, `description`) alongside translation-ready
fields (`name_translations`, `description_translations`).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from config import db

F1_2026_SEASON = 2026
F1_2026_CHAMPIONSHIP_ID = "championship-f1-2026"
F1_2026_CHAMPIONSHIP_SLUG = "formula-1-2026"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def championship_id_for_season(season: int | None) -> str | None:
    if season == F1_2026_SEASON:
        return F1_2026_CHAMPIONSHIP_ID
    return None


def championship_id_for_race(race: dict | None) -> str | None:
    if not race:
        return None
    if race.get("championship_id"):
        return race["championship_id"]
    season = race.get("season")
    if season is None and str(race.get("id", "")).endswith("-2026"):
        season = F1_2026_SEASON
    return championship_id_for_season(season)


def race_championship_link(
    race: dict,
    *,
    championship_id: str | None = None,
) -> dict:
    resolved_id = championship_id or championship_id_for_race(race)
    if not resolved_id:
        return {}
    season = race.get("season")
    if season is None and resolved_id == F1_2026_CHAMPIONSHIP_ID:
        season = F1_2026_SEASON
    return {
        "championship_id": resolved_id,
        "championship_ids": [resolved_id],
        **({"season": season} if season is not None else {}),
    }


def with_championship_link(race: dict, *, championship_id: str | None = None) -> dict:
    return {
        **race,
        **race_championship_link(race, championship_id=championship_id),
    }


def f1_2026_championship_doc(
    *,
    race_ids: list[str] | None = None,
    active_race_ids: list[str] | None = None,
    cancelled_race_ids: list[str] | None = None,
) -> dict:
    all_race_ids = race_ids or []
    active_ids = active_race_ids or all_race_ids
    cancelled_ids = cancelled_race_ids or []
    return {
        "id": F1_2026_CHAMPIONSHIP_ID,
        "slug": F1_2026_CHAMPIONSHIP_SLUG,
        "series": "formula_1",
        "season": F1_2026_SEASON,
        "name": "Formula 1 2026",
        "name_translations": {
            "fr": "Formule 1 2026",
            "en": "Formula 1 2026",
        },
        "description": "Championnat du monde FIA de Formule 1 2026.",
        "description_translations": {
            "fr": "Championnat du monde FIA de Formule 1 2026.",
            "en": "2026 FIA Formula One World Championship.",
        },
        "thumbnail_url": "/images/races/australia-2026.webp",
        "is_active": True,
        "race_ids": all_race_ids,
        "active_race_ids": active_ids,
        "cancelled_race_ids": cancelled_ids,
        "races_count": len(all_race_ids),
        "active_races_count": len(active_ids),
        "cancelled_races_count": len(cancelled_ids),
    }


def f1_2026_championship_from_races(races: list[dict]) -> dict:
    race_ids = [race["id"] for race in races]
    cancelled_ids = [race["id"] for race in races if race.get("is_cancelled")]
    active_ids = [race["id"] for race in races if not race.get("is_cancelled")]
    return f1_2026_championship_doc(
        race_ids=race_ids,
        active_race_ids=active_ids,
        cancelled_race_ids=cancelled_ids,
    )


async def ensure_f1_2026_championship(
    *,
    races: list[dict],
    actor: str | None = None,
) -> dict:
    now = _now_iso()
    championship = f1_2026_championship_from_races(races)
    await db.championships.update_one(
        {"id": F1_2026_CHAMPIONSHIP_ID},
        {
            "$set": {
                **championship,
                "updated_at": now,
                "updated_by": actor,
            },
            "$setOnInsert": {
                "created_at": now,
                "created_by": actor,
            },
        },
        upsert=True,
    )
    return championship


async def championship_context_for_race_id(race_id: str) -> dict[str, Any]:
    race = await db.races.find_one(
        {"id": race_id},
        {"_id": 0, "championship_id": 1, "season": 1},
    )
    if race:
        championship_id = championship_id_for_race(race)
        return {
            "season": race.get("season"),
            **({"championship_id": championship_id} if championship_id else {}),
        }

    # Fallback for static-calendar races before the editable calendar is seeded.
    if race_id.endswith("-2026"):
        return {"season": F1_2026_SEASON, "championship_id": F1_2026_CHAMPIONSHIP_ID}

    return {}


async def backfill_f1_2026_entity_links(*, race_ids: list[str]) -> dict[str, int]:
    race_query = {"race_id": {"$in": race_ids}}
    set_payload = {
        "season": F1_2026_SEASON,
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
    }
    results: dict[str, int] = {}

    for collection_name in (
        "predictions",
        "race_results",
        "custom_predictions",
        "minigame_results",
        "minigame_scores",
        "notifications",
        "result_views",
    ):
        collection = getattr(db, collection_name)
        result = await collection.update_many(race_query, {"$set": set_payload})
        results[collection_name] = result.modified_count

    leaderboard_result = await db.leaderboard.update_many(
        {
            "$or": [
                {"season": F1_2026_SEASON},
                {"season": {"$exists": False}},
            ]
        },
        {"$set": set_payload},
    )
    results["leaderboard"] = leaderboard_result.modified_count
    return results
