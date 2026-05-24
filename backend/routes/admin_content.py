"""
PRONOKIF - Admin Back-Office: Content & Settings.

Invitations, media uploads, app settings, dashboard stats.

Endpoints:
  POST   /admin-bo/invitations         - send email invitation
  GET    /admin-bo/invitations         - list sent invitations

  POST   /admin-bo/media/upload        - upload media
  GET    /admin-bo/media               - list media
  GET    /admin-bo/media/:id/file      - serve media file
  DELETE /admin-bo/media/:id           - delete media

  GET    /admin-bo/settings            - get app settings
  PUT    /admin-bo/settings            - update app settings

  GET    /admin-bo/stats               - dashboard statistics
"""

from __future__ import annotations

import base64
import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr

from config import db, logger
from routes.admin_auth import _send_invitation_email, get_current_admin

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-content"])


# ═══════════════════════════════════════ INVITATIONS ══════════════════════════


class InvitationSend(BaseModel):
    email: EmailStr
    message: str | None = None


@router.post("/invitations")
async def send_invitation(
    data: InvitationSend, admin: dict = Depends(get_current_admin)
) -> dict:
    """Send an email invitation to create an account."""
    existing = await db.invitations.find_one({"email": data.email.lower()})
    if existing and not existing.get("accepted"):
        raise HTTPException(status_code=400, detail="Invitation deja envoyee a cette adresse")

    invite_token = secrets.token_urlsafe(32)
    invitation = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "message": data.message,
        "token": invite_token,
        "sent_by": admin["email"],
        "accepted": False,
        "created_at": datetime.now(UTC).isoformat(),
        "expires_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
    }
    await db.invitations.insert_one(invitation)

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    invite_url = f"{frontend_url}/auth?invite={invite_token}"

    if not await _send_invitation_email(data.email, invite_url, data.message):
        logger.info(f"[Invitation] Link for {data.email}: {invite_url}")

    return {"message": "Invitation envoyee", "id": invitation["id"]}


@router.get("/invitations")
async def list_invitations(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all sent invitations."""
    return await db.invitations.find(
        {}, {"_id": 0, "token": 0}
    ).sort("created_at", -1).to_list(200)


# ═══════════════════════════════════════ MEDIA ════════════════════════════════


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity_type: str = "general",
    entity_id: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Upload a media file (image/thumbnail)."""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporte: {file.content_type}",
        )

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"{file_id}.{ext}"

    media_doc = {
        "id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "uploaded_by": admin["email"],
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.media.insert_one(media_doc)

    return {"id": file_id, "filename": filename, "url": f"/api/admin-bo/media/{file_id}/file"}


@router.get("/media")
async def list_media(
    entity_type: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all uploaded media."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    return await db.media.find(
        query, {"_id": 0, "data": 0}
    ).sort("created_at", -1).to_list(200)


@router.get("/media/{media_id}/file")
async def get_media_file(media_id: str) -> Response:
    """Serve a media file by ID."""
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Fichier non trouve")

    content = base64.b64decode(media["data"])
    return Response(content=content, media_type=media["content_type"])


@router.delete("/media/{media_id}")
async def delete_media(
    media_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a media file."""
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return {"message": "Fichier supprime"}


# ═══════════════════════════════════════ SETTINGS ═════════════════════════════


class AppSettings(BaseModel):
    app_name: str | None = None
    app_description: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None
    logo_url: str | None = None
    favicon_url: str | None = None
    maintenance_mode: bool | None = None
    registration_open: bool | None = None
    max_leagues_per_user: int | None = None
    current_season: int | None = None


@router.get("/settings")
async def get_settings(admin: dict = Depends(get_current_admin)) -> dict:
    """Get app settings."""
    settings = await db.app_settings.find_one({"_id": "global"})
    if not settings:
        settings = {
            "app_name": "Pronokif",
            "app_description": "Jeu de pronostics F1",
            "primary_color": "#f97316",
            "accent_color": "#06b6d4",
            "maintenance_mode": False,
            "registration_open": True,
            "max_leagues_per_user": 5,
            "current_season": 2025,
        }
    else:
        del settings["_id"]
    return settings


@router.put("/settings")
async def update_settings(
    data: AppSettings, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update app settings."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": updates},
        upsert=True,
    )
    return {"message": "Parametres mis a jour"}


# ═══════════════════════════════════════ STATS DASHBOARD ══════════════════════


@router.get("/stats")
async def get_dashboard_stats(admin: dict = Depends(get_current_admin)) -> dict:
    """Get admin dashboard statistics."""
    total_users = await db.users.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    total_leagues = await db.leagues.count_documents({})
    total_races = await db.races.count_documents({})
    unread_feedbacks = await db.feedback.count_documents({"read": False})
    pending_invitations = await db.invitations.count_documents({"accepted": False})

    week_ago = (datetime.now(UTC) - timedelta(days=7)).isoformat()
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_leagues": total_leagues,
        "total_races": total_races,
        "unread_feedbacks": unread_feedbacks,
        "pending_invitations": pending_invitations,
        "new_users_week": new_users_week,
    }
