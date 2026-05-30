"""
PRONOKIF - Admin Back-Office: User Management.

Admin user listing, analytics, exports, detail views, activity, update, and
deletion workflows.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db, logger
from routes.admin_auth import ADMIN_EMAILS, get_current_admin
from services.admin_activity import log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_users import (
    is_protected_admin_user,
    user_admin_stats,
    users_admin_analytics,
    users_search_query,
)
from services.auth import (
    MAGIC_LINK_EXPIRE_MINUTES,
    create_magic_login_token,
    send_magic_login_email,
)
from services.email import send_email
from services.league_membership import ensure_leaderboard_entry

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-users"])


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    level: int | None = None
    xp: int | None = None
    is_banned: bool | None = None


class ManualLeagueInvitation(BaseModel):
    league_id: str = Field(..., min_length=1, max_length=120)
    message: str | None = Field(default=None, max_length=2000)
    send_email: bool = True
    send_notification: bool = True
    add_member: bool = False


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _league_join_url(code: str) -> str:
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{frontend_url}/join/{code}"


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all users with pagination and search."""
    query = users_search_query(search)
    total = await db.users.count_documents(query)
    users = (
        await db.users.find(query, {"_id": 0, "password_hash": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@router.get("/users/analytics")
async def get_users_analytics(
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return admin user analytics derived from users, predictions, and leagues."""
    return await users_admin_analytics(search=search)


@router.get("/users/export")
async def export_users_csv(
    search: str = "",
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export filtered user analytics as CSV."""
    analytics = await users_admin_analytics(search=search, limit=min(max(export_limit, 1), 5000))
    rows = analytics["users"]
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="user.export",
        entity_type="user_export",
        entity_id="users-csv",
        metadata={"rows": len(rows), "filters": {"search": search}},
    )
    return csv_response(
        "pronokif-users.csv",
        rows,
        [
            ("user_id", "ID joueur"),
            ("email", "Email"),
            ("username", "Pseudo"),
            ("created_at", "Inscription"),
            ("last_login_at", "Dernière connexion"),
            ("last_prediction_at", "Dernier pronostic"),
            ("is_banned", "Banni"),
            ("level", "Niveau"),
            ("xp", "XP"),
            ("predictions_count", "Pronostics"),
            ("complete_predictions", "Pronostics complets"),
            ("incomplete_predictions", "Pronostics incomplets"),
            ("locked_predictions", "Pronostics verrouillés"),
            ("scored_predictions", "Pronostics scorés"),
            ("total_points", "Points"),
            ("average_points", "Moyenne points"),
            ("leagues_count", "Ligues"),
            ("owned_leagues_count", "Ligues créées"),
        ],
    )


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Get user detail with stats."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    stats = await user_admin_stats(user_id)
    return {**user, **stats}


@router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Get a user's prediction, league, and moderation stats."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"user": user, "stats": await user_admin_stats(user_id, user)}


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List admin activity logs that touched a user or their predictions."""
    limit = min(max(limit, 1), 100)
    query = {"$or": [{"entity_type": "user", "entity_id": user_id}, {"metadata.user_id": user_id}]}
    total = await db.admin_activity_logs.count_documents(query)
    logs = (
        await db.admin_activity_logs.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"logs": logs, "total": total, "skip": skip, "limit": limit}


@router.post("/users/{user_id}/magic-link")
async def resend_user_magic_link(
    user_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Manually send a user magic login link from the admin back office."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "email": 1, "username": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    email = str(user.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Cet utilisateur n'a pas d'email")

    token, token_id = create_magic_login_token(user_id)
    await db.user_magic_links.insert_one(
        {
            "token_id": token_id,
            "user_id": user_id,
            "email": email,
            "used": False,
            "created_at": datetime.now(UTC),
            "expires_at": datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRE_MINUTES),
            "created_by_admin": admin.get("email"),
            "source": "admin_backoffice",
        }
    )
    email_sent = await send_magic_login_email(email, token)
    if not email_sent:
        logger.info("[Admin User] Magic link delivery not confirmed for %s", email)

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="user.magic_link_resend",
        entity_type="user",
        entity_id=user_id,
        metadata={"user_id": user_id, "email": email, "email_sent": email_sent},
    )
    return {"message": "Lien magique généré", "email_sent": email_sent}


@router.post("/users/{user_id}/league-invitation")
async def send_manual_league_invitation(
    user_id: str,
    data: ManualLeagueInvitation,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Invite or manually add an existing user to a league."""
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "email": 1, "username": 1, "unread_notifications": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    league = await db.leagues.find_one(
        {"id": data.league_id},
        {"_id": 0, "id": 1, "name": 1, "code": 1, "members": 1, "created_by": 1},
    )
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")

    members = league.get("members") or []
    already_member = user_id in members
    member_added = False
    if data.add_member and not already_member:
        await db.leagues.update_one({"id": data.league_id}, {"$addToSet": {"members": user_id}})
        await ensure_leaderboard_entry(league, user_id, previous_position=len(members) + 1)
        member_added = True

    join_url = _league_join_url(str(league.get("code") or ""))
    message = (
        data.message.strip()
        if data.message
        else f"Tu es invité à rejoindre la ligue {league.get('name')} sur PronoKif."
    )

    notification_sent = False
    if data.send_notification:
        notification_id = str(uuid.uuid4())
        notification = {
            "id": notification_id,
            "title": f"Invitation ligue - {league.get('name')}",
            "message": f"{message} Code : {league.get('code')}",
            "type": "important",
            "target_user_ids": [user_id],
            "league_id": data.league_id,
            "league_code": league.get("code"),
            "join_url": join_url,
            "title_translations": {"fr": f"Invitation ligue - {league.get('name')}"},
            "message_translations": {"fr": f"{message} Code : {league.get('code')}"},
            "created_at": _now_iso(),
            "created_by": admin.get("id") or admin.get("email"),
        }
        await db.notifications.insert_one(notification)
        await db.users.update_one({"id": user_id}, {"$addToSet": {"unread_notifications": notification_id}})
        notification_sent = True

    email_sent = False
    email = str(user.get("email") or "").strip()
    if data.send_email and email:
        subject = f"Invitation PronoKif - {league.get('name')}"
        text_body = (
            f"{message}\n\n"
            f"Code de ligue : {league.get('code')}\n"
            f"Lien : {join_url}\n\n"
            "Si tu es déjà membre, tu peux ignorer ce message."
        )
        html_body = (
            f"<p>{message}</p>"
            f"<p><strong>Code de ligue :</strong> {league.get('code')}</p>"
            f"<p><a href=\"{join_url}\">Rejoindre la ligue</a></p>"
            "<p>Si tu es déjà membre, tu peux ignorer ce message.</p>"
        )
        email_sent = await send_email(email, subject, text_body, html_body)

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="user.league_invitation",
        entity_type="user",
        entity_id=user_id,
        metadata={
            "user_id": user_id,
            "league_id": data.league_id,
            "league_code": league.get("code"),
            "already_member": already_member,
            "member_added": member_added,
            "email_sent": email_sent,
            "notification_sent": notification_sent,
        },
    )
    return {
        "message": "Invitation ligue traitée",
        "already_member": already_member,
        "member_added": member_added,
        "email_sent": email_sent,
        "notification_sent": notification_sent,
        "join_url": join_url,
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str, data: UserUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a user."""
    updates = {key: value for key, value in data.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="user.update",
        entity_type="user",
        entity_id=user_id,
        metadata={"fields": sorted(updates.keys()), "user_id": user_id},
    )
    return {"message": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a user and their data."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if is_protected_admin_user(user, ADMIN_EMAILS):
        raise HTTPException(
            status_code=403,
            detail="Impossible de supprimer un compte administrateur",
        )
    await db.users.delete_one({"id": user_id})
    await db.predictions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="user.delete",
        entity_type="user",
        entity_id=user_id,
        metadata={"email": user.get("email"), "username": user.get("username"), "user_id": user_id},
    )
    return {"message": "User and data deleted"}
