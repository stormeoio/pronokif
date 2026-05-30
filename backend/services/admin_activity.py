from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from config import db as default_db


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def admin_activity_doc(
    admin: dict,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    created_at: str | None = None,
) -> dict:
    actor_email = str(admin.get("email") or "").strip().lower()
    actor_id = str(admin.get("id") or actor_email or "admin")
    return {
        "id": str(uuid.uuid4()),
        "actor_id": actor_id,
        "actor_email": actor_email,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "created_at": created_at or _now_iso(),
    }


def activity_log_query(
    *,
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    q: str = "",
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if actor_email:
        query["actor_email"] = actor_email.strip().lower()
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if action:
        query["action"] = action
    if q:
        query["$or"] = [
            {"actor_email": {"$regex": q, "$options": "i"}},
            {"action": {"$regex": q, "$options": "i"}},
            {"entity_type": {"$regex": q, "$options": "i"}},
            {"entity_id": {"$regex": q, "$options": "i"}},
            {"metadata.user_id": {"$regex": q, "$options": "i"}},
            {"metadata.username": {"$regex": q, "$options": "i"}},
            {"metadata.email": {"$regex": q, "$options": "i"}},
            {"metadata.race_id": {"$regex": q, "$options": "i"}},
        ]
    return query


async def log_admin_activity(
    db_handle: Any,
    admin: dict,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    created_at: str | None = None,
) -> dict | None:
    collection = getattr(db_handle, "admin_activity_logs", None)
    if collection is None:
        return None
    activity = admin_activity_doc(
        admin,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata,
        created_at=created_at,
    )
    await collection.insert_one(activity)
    return activity


async def log_backoffice_activity(
    admin: dict,
    *,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    db_handle: Any | None = None,
) -> dict | None:
    """Record an admin back-office action against the configured application DB."""
    return await log_admin_activity(
        default_db if db_handle is None else db_handle,
        admin,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata,
        created_at=_now_iso(),
    )
