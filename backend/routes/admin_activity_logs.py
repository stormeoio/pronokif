"""
PRONOKIF - Admin Back-Office: activity logs.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import activity_log_query, log_backoffice_activity
from services.admin_csv import csv_response

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-activity"])


@router.get("/activity-logs/export")
async def export_activity_logs_csv(
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    q: str = "",
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export filtered admin activity logs as CSV."""
    limit = min(max(export_limit, 1), 5000)
    query = activity_log_query(
        actor_email=actor_email,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        q=q,
    )
    logs = (
        await db.admin_activity_logs.find(query, {"_id": 0})
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    rows = [
        {
            "id": log.get("id"),
            "created_at": log.get("created_at"),
            "actor_email": log.get("actor_email"),
            "action": log.get("action"),
            "entity_type": log.get("entity_type"),
            "entity_id": log.get("entity_id"),
            "metadata": log.get("metadata"),
        }
        for log in logs
    ]
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="activity_logs.export",
        entity_type="activity_logs_export",
        entity_id="activity-logs-csv",
        metadata={"rows": len(rows), "filters": {"q": q, "entity_type": entity_type, "action": action}},
    )
    return csv_response(
        "pronokif-admin-activity.csv",
        rows,
        [
            ("id", "ID"),
            ("created_at", "Date"),
            ("actor_email", "Admin"),
            ("action", "Action"),
            ("entity_type", "Type entité"),
            ("entity_id", "ID entité"),
            ("metadata", "Métadonnées"),
        ],
    )


@router.get("/activity-logs")
async def list_activity_logs(
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List admin activity logs for moderation and operational traceability."""
    limit = min(max(limit, 1), 100)
    query = activity_log_query(
        actor_email=actor_email,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        q=q,
    )

    total = await db.admin_activity_logs.count_documents(query)
    logs = (
        await db.admin_activity_logs.find(query, {"_id": 0})
        .skip(max(skip, 0))
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"logs": logs, "total": total, "skip": skip, "limit": limit}
