"""
PRONOKIF - Admin Back-Office: User Management.

Admin user listing, analytics, exports, detail views, activity, update, and
deletion workflows.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from config import db
from routes.admin_auth import ADMIN_EMAILS, get_current_admin
from services.admin_activity import log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_users import (
    is_protected_admin_user,
    user_admin_stats,
    users_admin_analytics,
    users_search_query,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-users"])


class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    level: int | None = None
    xp: int | None = None
    is_banned: bool | None = None


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
    return {"user": user, "stats": await user_admin_stats(user_id)}


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
