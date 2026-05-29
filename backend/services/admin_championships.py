from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException

from config import db
from services.admin_predictions import linked_entity_query


def championship_create_doc(
    data: Any,
    *,
    now: str,
    actor_email: str | None,
    championship_id: str | None = None,
) -> dict:
    return {
        "id": championship_id or str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": now,
        "updated_at": now,
        "created_by": actor_email,
    }


def championship_update_payload(data: Any, *, now: str, actor_email: str | None) -> dict:
    updates = {key: value for key, value in data.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    updates["updated_at"] = now
    updates["updated_by"] = actor_email
    return updates


async def championship_with_counts(championship: dict) -> dict:
    championship_id = championship["id"]
    race_docs = await db.races.find(
        {"championship_id": championship_id},
        {"_id": 0, "id": 1, "name": 1, "date": 1, "status": 1, "is_cancelled": 1, "round_number": 1},
    ).sort("date", 1).to_list(100)
    race_ids = [race["id"] for race in race_docs] or championship.get("race_ids", [])
    entity_query = linked_entity_query(championship_id, race_ids)
    linked_counts = {
        "races": len(race_ids),
        "predictions": await db.predictions.count_documents(entity_query),
        "race_results": await db.race_results.count_documents(entity_query),
        "custom_predictions": await db.custom_predictions.count_documents(entity_query),
        "minigame_results": await db.minigame_results.count_documents(entity_query),
        "leaderboard_entries": await db.leaderboard.count_documents({"championship_id": championship_id}),
    }
    cancelled_count = len([race for race in race_docs if race.get("is_cancelled")])
    return {
        **championship,
        "race_ids": race_ids,
        "races": race_docs,
        "races_count": len(race_ids),
        "active_races_count": max(len(race_ids) - cancelled_count, 0),
        "cancelled_races_count": cancelled_count,
        "linked_counts": linked_counts,
    }
