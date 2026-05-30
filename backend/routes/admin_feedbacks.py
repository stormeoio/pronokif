"""
PRONOKIF - Admin Back-Office: feedback triage.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import _now_iso, log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_feedbacks import feedback_analytics_from_docs, feedback_query
from services.email import send_email
from services.email_templates import feedback_reply

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-feedbacks"])


class FeedbackAdminUpdate(BaseModel):
    category: str | None = Field(default=None, max_length=50)
    read: bool | None = None
    status: str | None = Field(default=None, max_length=50)
    priority: str | None = Field(default=None, max_length=50)
    assigned_to: str | None = Field(default=None, max_length=255)
    admin_note: str | None = Field(default=None, max_length=4000)
    admin_reply: str | None = Field(default=None, max_length=4000)


class FeedbackBatchActionRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1, max_length=200)
    action: str = Field(..., pattern="^(mark_read|mark_unread|delete|set_status|set_priority|assign)$")
    status: str | None = Field(default=None, max_length=50)
    priority: str | None = Field(default=None, max_length=50)
    assigned_to: str | None = Field(default=None, max_length=255)


class FeedbackReplyRequest(BaseModel):
    reply: str = Field(..., min_length=1, max_length=4000)
    status: str | None = Field(default=None, max_length=50)
    mark_read: bool = True


async def _enrich_feedback_user_identity(feedbacks: list[dict]) -> list[dict]:
    user_ids = {feedback.get("user_id") for feedback in feedbacks if feedback.get("user_id")}
    emails = {
        str(feedback.get("email") or "").strip().lower()
        for feedback in feedbacks
        if str(feedback.get("email") or "").strip()
    }
    if not user_ids and not emails:
        return feedbacks

    query: dict[str, Any] = {"$or": []}
    if user_ids:
        query["$or"].append({"id": {"$in": list(user_ids)}})
    if emails:
        query["$or"].append({"email": {"$in": list(emails)}})

    users = await db.users.find(
        query,
        {"_id": 0, "id": 1, "email": 1, "username": 1, "avatar_id": 1, "custom_avatar_url": 1},
    ).to_list(len(user_ids) + len(emails) or 1)
    users_by_id = {user.get("id"): user for user in users if user.get("id")}
    users_by_email = {str(user.get("email") or "").strip().lower(): user for user in users if user.get("email")}

    for feedback in feedbacks:
        user = users_by_id.get(feedback.get("user_id")) or users_by_email.get(
            str(feedback.get("email") or "").strip().lower()
        )
        if not user:
            continue
        feedback.setdefault("user_id", user.get("id"))
        feedback["username"] = feedback.get("username") or user.get("username")
        feedback["email"] = feedback.get("email") or user.get("email")
        feedback["avatar_id"] = user.get("avatar_id")
        feedback["custom_avatar_url"] = user.get("custom_avatar_url")
    return feedbacks


@router.get("/feedbacks")
async def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    q: str = "",
    category: str | None = None,
    read_status: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all feedbacks."""
    limit = min(max(limit, 1), 100)
    query = feedback_query(
        q=q,
        category=category,
        read_status="unread" if unread_only else read_status,
        status=status,
        priority=priority,
        owner=owner,
        current_admin_email=admin.get("email"),
    )
    if unread_only:
        query["read"] = False
    total = await db.feedback.count_documents(query)
    feedbacks = (
        await db.feedback.find(query, {"_id": 0})
        .skip(max(skip, 0))
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    feedbacks = await _enrich_feedback_user_identity(feedbacks)
    return {"feedbacks": feedbacks, "total": total, "skip": skip, "limit": limit}


@router.get("/feedbacks/analytics")
async def get_feedbacks_analytics(
    q: str = "",
    category: str | None = None,
    read_status: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return feedback analytics for support triage."""
    feedbacks = await db.feedback.find(
        feedback_query(
            q=q,
            category=category,
            read_status=read_status,
            status=status,
            priority=priority,
            owner=owner,
            current_admin_email=admin.get("email"),
        ),
        {"_id": 0},
    ).limit(5000).to_list(5000)
    return feedback_analytics_from_docs(feedbacks)


@router.get("/feedbacks/export")
async def export_feedbacks_csv(
    q: str = "",
    category: str | None = None,
    read_status: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export filtered feedback rows as CSV."""
    limit = min(max(export_limit, 1), 5000)
    rows = await (
        db.feedback.find(
            feedback_query(
                q=q,
                category=category,
                read_status=read_status,
                status=status,
                priority=priority,
                owner=owner,
                current_admin_email=admin.get("email"),
            ),
            {"_id": 0},
        )
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.export",
        entity_type="feedback_export",
        entity_id="feedbacks-csv",
        metadata={
            "rows": len(rows),
            "filters": {
                "q": q,
                "category": category,
                "read_status": read_status,
                "status": status,
                "priority": priority,
                "owner": owner,
            },
        },
    )
    return csv_response(
        "pronokif-feedbacks.csv",
        rows,
        [
            ("id", "ID"),
            ("user_id", "ID joueur"),
            ("username", "Pseudo"),
            ("category", "Catégorie"),
            ("message", "Message"),
            ("read", "Lu"),
            ("status", "Statut"),
            ("priority", "Priorité"),
            ("assigned_to", "Assigné à"),
            ("admin_note", "Note admin"),
            ("admin_reply", "Réponse admin"),
            ("admin_reply_sent_at", "Réponse envoyée le"),
            ("created_at", "Créé le"),
            ("updated_at", "Mis à jour le"),
        ],
    )


@router.post("/feedbacks/batch")
async def batch_feedbacks_action(
    data: FeedbackBatchActionRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Apply one moderation action to several feedback rows."""
    ids = [feedback_id.strip() for feedback_id in data.ids if feedback_id.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="Aucun retour sélectionné")

    query = {"id": {"$in": ids}}
    update: dict[str, Any] | None = None
    deleted = 0
    matched = 0

    if data.action == "delete":
        result = await db.feedback.delete_many(query)
        deleted = result.deleted_count
        matched = deleted
    else:
        if data.action == "mark_read":
            update = {"read": True}
        elif data.action == "mark_unread":
            update = {"read": False}
        elif data.action == "set_status":
            if not data.status:
                raise HTTPException(status_code=400, detail="Statut requis")
            update = {"status": data.status}
        elif data.action == "set_priority":
            if not data.priority:
                raise HTTPException(status_code=400, detail="Priorité requise")
            update = {"priority": data.priority}
        elif data.action == "assign":
            if data.assigned_to is None:
                raise HTTPException(status_code=400, detail="Assignation requise")
            update = {"assigned_to": data.assigned_to.strip()}
        else:
            raise HTTPException(status_code=400, detail="Action inconnue")

        update["updated_at"] = _now_iso()
        update["updated_by"] = admin.get("email")
        result = await db.feedback.update_many(query, {"$set": update})
        matched = result.matched_count

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action=f"feedback.batch.{data.action}",
        entity_type="feedback",
        entity_id="batch",
        metadata={"ids": ids, "matched": matched, "deleted": deleted, "status": data.status, "priority": data.priority},
    )
    return {"message": "Action appliquée", "matched": matched, "deleted": deleted}


@router.put("/feedbacks/{feedback_id}")
async def update_feedback_admin(
    feedback_id: str,
    data: FeedbackAdminUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update feedback triage metadata."""
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    updates["updated_at"] = _now_iso()
    updates["updated_by"] = admin.get("email")
    result = await db.feedback.update_one({"id": feedback_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    feedback = await db.feedback.find_one({"id": feedback_id}, {"_id": 0})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.update",
        entity_type="feedback",
        entity_id=feedback_id,
        metadata={"fields": sorted(updates.keys()), "user_id": feedback.get("user_id") if feedback else None},
    )
    return {"message": "Feedback mis à jour", "feedback": feedback}


@router.post("/feedbacks/{feedback_id}/reply")
async def reply_to_feedback(
    feedback_id: str,
    data: FeedbackReplyRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Store an admin answer and try to send it to the feedback author."""
    feedback = await db.feedback.find_one({"id": feedback_id}, {"_id": 0})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback non trouve")

    reply = data.reply.strip()
    if not reply:
        raise HTTPException(status_code=400, detail="Réponse requise")
    now = _now_iso()
    recipient_email = str(feedback.get("email") or "").strip()
    if not recipient_email and feedback.get("user_id"):
        user = await db.users.find_one({"id": feedback.get("user_id")}, {"_id": 0, "email": 1, "locale": 1})
        recipient_email = str(user.get("email") or "").strip() if user else ""
        if user and user.get("locale") and not feedback.get("locale"):
            feedback["locale"] = user.get("locale")

    locale = str(feedback.get("locale") or "fr")
    template = feedback_reply(reply, str(feedback.get("message") or ""), lang=locale)
    email_sent = False
    delivery_status = "missing_email"
    if recipient_email:
        email_sent = await send_email(
            recipient_email,
            template.subject,
            template.text,
            template.html_body,
        )
        delivery_status = "sent" if email_sent else "not_sent"

    updates: dict[str, Any] = {
        "admin_reply": reply,
        "admin_reply_by": admin.get("email"),
        "admin_reply_at": now,
        "admin_reply_delivery": delivery_status,
        "admin_reply_email": recipient_email,
        "updated_at": now,
        "updated_by": admin.get("email"),
    }
    if data.mark_read:
        updates["read"] = True
    if data.status:
        updates["status"] = data.status

    update_operation: dict[str, Any] = {"$set": updates}
    if email_sent:
        updates["admin_reply_sent_at"] = now
    else:
        update_operation["$unset"] = {"admin_reply_sent_at": ""}

    await db.feedback.update_one({"id": feedback_id}, update_operation)
    updated_feedback = await db.feedback.find_one({"id": feedback_id}, {"_id": 0})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.reply",
        entity_type="feedback",
        entity_id=feedback_id,
        metadata={
            "email": recipient_email,
            "email_sent": email_sent,
            "delivery_status": delivery_status,
            "status": data.status,
        },
    )
    return {
        "message": "Réponse enregistrée",
        "email_sent": email_sent,
        "delivery_status": delivery_status,
        "feedback": updated_feedback,
    }


@router.put("/feedbacks/{feedback_id}/read")
async def mark_feedback_read(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Mark feedback as read."""
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"read": True, "updated_at": _now_iso(), "updated_by": admin.get("email")}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.mark_read",
        entity_type="feedback",
        entity_id=feedback_id,
        metadata={},
    )
    return {"message": "Marque comme lu"}


@router.put("/feedbacks/{feedback_id}/unread")
async def mark_feedback_unread(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Mark feedback as unread."""
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"read": False, "updated_at": _now_iso(), "updated_by": admin.get("email")}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.mark_unread",
        entity_type="feedback",
        entity_id=feedback_id,
        metadata={},
    )
    return {"message": "Marque comme non lu"}


@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a feedback entry."""
    feedback = await db.feedback.find_one({"id": feedback_id}, {"_id": 0})
    result = await db.feedback.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="feedback.delete",
        entity_type="feedback",
        entity_id=feedback_id,
        metadata={"user_id": feedback.get("user_id") if feedback else None},
    )
    return {"message": "Feedback supprime"}
