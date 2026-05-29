"""
PRONOKIF - Admin Back-Office: Invitation Management.

Invitation creation, batch sending, resend/revoke/delete operations, analytics
and CSV exports.
"""

from __future__ import annotations

import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field

from config import db, logger
from routes.admin_auth import _send_invitation_email, get_current_admin
from services.admin_activity import log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_invitations import (
    invitation_analytics_from_docs,
    invitation_payload,
    invitation_search_query,
    invitation_status,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-invitations"])


class InvitationSend(BaseModel):
    email: EmailStr
    message: str | None = None


class InvitationBatchSend(BaseModel):
    emails: list[EmailStr] = Field(..., min_length=1, max_length=100)
    message: str | None = None


class InvitationUpdate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)
    admin_note: str | None = Field(default=None, max_length=4000)
    review_status: str | None = Field(default=None, max_length=50)


class InvitationResend(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _dedupe_invitation_emails(emails: list[EmailStr]) -> tuple[list[str], list[dict]]:
    seen: set[str] = set()
    unique: list[str] = []
    skipped: list[dict] = []

    for email in emails:
        normalized = str(email).strip().lower()
        if normalized in seen:
            skipped.append({"email": normalized, "reason": "duplicate in batch"})
            continue
        seen.add(normalized)
        unique.append(normalized)

    return unique, skipped


def _build_invitation_doc(email: str, message: str | None, admin_email: str) -> tuple[dict, str]:
    invite_token = secrets.token_urlsafe(32)
    invitation = {
        "id": str(uuid.uuid4()),
        "email": email,
        "message": message,
        "token": invite_token,
        "sent_by": admin_email,
        "accepted": False,
        "created_at": datetime.now(UTC).isoformat(),
        "expires_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
    }
    return invitation, invite_token


def _build_invitation_url(invite_token: str) -> str:
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{frontend_url}/auth?invite={invite_token}"


@router.post("/invitations")
async def send_invitation(
    data: InvitationSend, admin: dict = Depends(get_current_admin)
) -> dict:
    """Send an email invitation to create an account."""
    email = str(data.email).strip().lower()
    existing = await db.invitations.find_one({"email": email})
    if existing and not existing.get("accepted"):
        raise HTTPException(status_code=400, detail="Invitation déjà envoyée à cette adresse")

    invitation, invite_token = _build_invitation_doc(email, data.message, admin["email"])
    await db.invitations.insert_one(invitation)

    invite_url = _build_invitation_url(invite_token)

    if not await _send_invitation_email(email, invite_url, data.message):
        logger.info(f"[Invitation] Link for {email}: {invite_url}")

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.create",
        entity_type="invitation",
        entity_id=invitation["id"],
        metadata={"email": email},
    )
    return {"message": "Invitation sent", "id": invitation["id"]}


@router.post("/invitations/batch")
async def send_invitations_batch(
    data: InvitationBatchSend, admin: dict = Depends(get_current_admin)
) -> dict:
    """Send multiple email invitations to create accounts."""
    emails, skipped = _dedupe_invitation_emails(data.emails)
    created: list[dict] = []
    failed: list[dict] = []

    for email in emails:
        existing = await db.invitations.find_one({"email": email})
        if existing and not existing.get("accepted"):
            skipped.append({"email": email, "reason": "invitation already pending"})
            continue

        invitation, invite_token = _build_invitation_doc(email, data.message, admin["email"])
        await db.invitations.insert_one(invitation)

        invite_url = _build_invitation_url(invite_token)
        try:
            email_sent = await _send_invitation_email(email, invite_url, data.message)
        except Exception as exc:
            logger.exception("[Invitation] Failed to email %s", email)
            failed.append({"email": email, "reason": str(exc) or "SMTP error"})
            continue

        if not email_sent:
            logger.info(f"[Invitation] Link for {email}: {invite_url}")

        created.append(
            {
                "email": email,
                "id": invitation["id"],
                "email_sent": email_sent,
            }
        )

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.batch_create",
        entity_type="invitation",
        entity_id="batch",
        metadata={"sent": len(created), "skipped": len(skipped), "failed": len(failed)},
    )
    return {
        "message": "Invitations traitees",
        "total": len(data.emails),
        "sent": len(created),
        "created": created,
        "skipped": skipped,
        "failed": failed,
    }


@router.get("/invitations")
async def list_invitations(
    search: str = "",
    status: str | None = None,
    sent_by: str | None = None,
    skip: int = 0,
    limit: int = 100,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all sent invitations."""
    limit = min(max(limit, 1), 200)
    docs = await db.invitations.find(
        invitation_search_query(search, sent_by),
        {"_id": 0, "token": 0},
    ).sort("created_at", -1).limit(5000).to_list(5000)
    rows = [invitation_payload(doc) for doc in docs]
    if status:
        rows = [row for row in rows if row["status"] == status]
    total = len(rows)
    return {"invitations": rows[skip : skip + limit], "total": total, "skip": skip, "limit": limit}


@router.get("/invitations/analytics")
async def get_invitations_analytics(
    search: str = "",
    status: str | None = None,
    sent_by: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return invitation funnel analytics."""
    docs = await db.invitations.find(
        invitation_search_query(search, sent_by),
        {"_id": 0, "token": 0},
    ).limit(5000).to_list(5000)
    if status:
        docs = [doc for doc in docs if invitation_status(doc) == status]
    return invitation_analytics_from_docs(docs)


@router.get("/invitations/export")
async def export_invitations_csv(
    search: str = "",
    status: str | None = None,
    sent_by: str | None = None,
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export invitations as CSV."""
    limit = min(max(export_limit, 1), 5000)
    docs = await db.invitations.find(
        invitation_search_query(search, sent_by),
        {"_id": 0, "token": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    rows = [invitation_payload(doc) for doc in docs]
    if status:
        rows = [row for row in rows if row["status"] == status]
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.export",
        entity_type="invitation_export",
        entity_id="invitations-csv",
        metadata={"rows": len(rows), "filters": {"search": search, "status": status, "sent_by": sent_by}},
    )
    return csv_response(
        "pronokif-invitations.csv",
        rows,
        [
            ("id", "ID"),
            ("email", "Email"),
            ("status", "Statut"),
            ("accepted", "Acceptée"),
            ("revoked", "Révoquée"),
            ("sent_by", "Envoyée par"),
            ("created_at", "Créée le"),
            ("expires_at", "Expire le"),
            ("accepted_at", "Acceptée le"),
            ("last_resent_at", "Dernier renvoi"),
            ("resend_count", "Renvois"),
            ("message", "Message"),
            ("admin_note", "Note admin"),
            ("review_status", "Statut revue"),
        ],
    )


@router.put("/invitations/{invitation_id}")
async def update_invitation_admin(
    invitation_id: str,
    data: InvitationUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update invitation admin metadata."""
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    updates["updated_at"] = _now_iso()
    updates["updated_by"] = admin.get("email")
    result = await db.invitations.update_one({"id": invitation_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0, "token": 0})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.update",
        entity_type="invitation",
        entity_id=invitation_id,
        metadata={"fields": sorted(updates.keys()), "email": invitation.get("email") if invitation else None},
    )
    return {"message": "Invitation mise à jour", "invitation": invitation_payload(invitation)}


@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: str,
    data: InvitationResend,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Refresh and resend an invitation link."""
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    if invitation.get("accepted"):
        raise HTTPException(status_code=400, detail="Invitation déjà acceptée")

    invite_token = secrets.token_urlsafe(32)
    message = data.message if data.message is not None else invitation.get("message")
    updates = {
        "token": invite_token,
        "message": message,
        "revoked": False,
        "expires_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        "last_resent_at": _now_iso(),
        "resend_count": int(invitation.get("resend_count") or 0) + 1,
        "updated_at": _now_iso(),
        "updated_by": admin.get("email"),
    }
    await db.invitations.update_one({"id": invitation_id}, {"$set": updates})

    invite_url = _build_invitation_url(invite_token)
    if not await _send_invitation_email(invitation["email"], invite_url, message):
        logger.info(f"[Invitation] Link for {invitation['email']}: {invite_url}")

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.resend",
        entity_type="invitation",
        entity_id=invitation_id,
        metadata={"email": invitation.get("email"), "resend_count": updates["resend_count"]},
    )
    updated = await db.invitations.find_one({"id": invitation_id}, {"_id": 0, "token": 0})
    return {"message": "Invitation renvoyée", "invitation": invitation_payload(updated)}


@router.post("/invitations/{invitation_id}/revoke")
async def revoke_invitation(
    invitation_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Revoke an invitation without deleting its history."""
    result = await db.invitations.update_one(
        {"id": invitation_id},
        {
            "$set": {
                "revoked": True,
                "revoked_at": _now_iso(),
                "revoked_by": admin.get("email"),
                "updated_at": _now_iso(),
                "updated_by": admin.get("email"),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0, "token": 0})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.revoke",
        entity_type="invitation",
        entity_id=invitation_id,
        metadata={"email": invitation.get("email") if invitation else None},
    )
    return {"message": "Invitation révoquée", "invitation": invitation_payload(invitation)}


@router.delete("/invitations/{invitation_id}")
async def delete_invitation(
    invitation_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Delete an invitation row."""
    invitation = await db.invitations.find_one({"id": invitation_id}, {"_id": 0, "token": 0})
    result = await db.invitations.delete_one({"id": invitation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="invitation.delete",
        entity_type="invitation",
        entity_id=invitation_id,
        metadata={"email": invitation.get("email") if invitation else None},
    )
    return {"message": "Invitation supprimée"}
