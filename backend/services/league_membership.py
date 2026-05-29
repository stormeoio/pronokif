"""League membership and leaderboard business helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from config import db
from services.championships import F1_2026_CHAMPIONSHIP_ID, F1_2026_SEASON


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def league_championship_fields(
    *,
    championship_id: str | None = None,
    season: int | None = None,
) -> dict[str, Any]:
    """Return canonical league fields for the currently supported championship."""
    resolved_championship_id = championship_id or F1_2026_CHAMPIONSHIP_ID
    resolved_season = season or (F1_2026_SEASON if resolved_championship_id == F1_2026_CHAMPIONSHIP_ID else None)
    fields: dict[str, Any] = {
        "championship_id": resolved_championship_id,
        "championship_ids": [resolved_championship_id],
    }
    if resolved_season is not None:
        fields["season"] = resolved_season
    return fields


def league_championship_context(league: dict | None) -> dict[str, Any]:
    return league_championship_fields(
        championship_id=(league or {}).get("championship_id"),
        season=(league or {}).get("season"),
    )


def leaderboard_query_for_league(
    league: dict,
    *,
    user_id: str | None = None,
    championship_id: str | None = None,
    include_legacy: bool = True,
) -> dict[str, Any]:
    """Build a leaderboard query scoped to a league championship.

    ``include_legacy`` keeps pre-championship leaderboard rows visible while
    they are progressively backfilled with F1 2026 metadata.
    """
    selected_championship_id = championship_id or league_championship_context(league).get("championship_id")
    query: dict[str, Any] = {"league_id": league["id"]}
    if user_id:
        query["user_id"] = user_id

    if selected_championship_id:
        if include_legacy:
            query["$or"] = [
                {"championship_id": selected_championship_id},
                {"championship_id": {"$exists": False}},
                {"championship_id": None},
            ]
        else:
            query["championship_id"] = selected_championship_id
    return query


async def ensure_leaderboard_entry(
    league: dict,
    user_id: str,
    *,
    previous_position: int | None = None,
) -> dict:
    """Ensure one leaderboard row exists for the user in the league context."""
    query = leaderboard_query_for_league(league, user_id=user_id)
    entry = await db.leaderboard.find_one(query, {"_id": 0})
    context = league_championship_context(league)
    now = now_iso()

    if entry:
        await db.leaderboard.update_one(
            {"id": entry["id"]},
            {
                "$set": {
                    **context,
                    "updated_at": now,
                }
            },
        )
        return {**entry, **context, "updated_at": now}

    document = {
        "id": str(uuid.uuid4()),
        "league_id": league["id"],
        "user_id": user_id,
        **context,
        "total_points": 0,
        "last_race_points": 0,
        "previous_position": previous_position,
        "created_at": now,
        "updated_at": now,
    }
    await db.leaderboard.insert_one(document)
    return document


async def current_leaderboard_position(league: dict, user_id: str) -> int:
    entries = await db.leaderboard.find(leaderboard_query_for_league(league), {"_id": 0}).to_list(1000)
    entries.sort(key=lambda row: int(row.get("total_points") or 0), reverse=True)
    return next((index + 1 for index, entry in enumerate(entries) if entry.get("user_id") == user_id), len(entries))
