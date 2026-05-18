"""
PRONOKIF - Admin Back-Office: Data Management.

CRUD for users, championships, races, predictions, feedbacks.

Endpoints:
  GET    /admin-bo/users               - list users (paginated, searchable)
  GET    /admin-bo/users/:id           - user detail with stats
  PUT    /admin-bo/users/:id           - update user
  DELETE /admin-bo/users/:id           - delete user + related data

  GET    /admin-bo/championships       - list championships
  POST   /admin-bo/championships       - create championship
  PUT    /admin-bo/championships/:id   - update championship
  DELETE /admin-bo/championships/:id   - delete championship

  GET    /admin-bo/races               - list races (filterable by season)
  POST   /admin-bo/races               - create race
  PUT    /admin-bo/races/:id           - update race
  DELETE /admin-bo/races/:id           - delete race

  GET    /admin-bo/predictions         - list predictions (filterable)

  GET    /admin-bo/feedbacks           - list feedbacks
  PUT    /admin-bo/feedbacks/:id/read  - mark feedback read
  DELETE /admin-bo/feedbacks/:id       - delete feedback
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-data"])


# ═══════════════════════════════════════ USERS CRUD ═══════════════════════════


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    is_banned: Optional[bool] = None


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all users with pagination and search."""
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    total = await db.users.count_documents(query)
    users = (
        await db.users.find(query, {"_id": 0, "password_hash": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Get user detail with stats."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    pred_count = await db.predictions.count_documents({"user_id": user_id})
    leagues = await db.leagues.find(
        {"$or": [{"created_by": user_id}, {"members": user_id}]},
        {"_id": 0, "id": 1, "name": 1},
    ).to_list(20)

    return {**user, "predictions_count": pred_count, "leagues": leagues}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str, data: UserUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a user."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return {"message": "Utilisateur mis a jour"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a user and their data."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    await db.users.delete_one({"id": user_id})
    await db.predictions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "Utilisateur et donnees supprimes"}


# ═══════════════════════════════════════ CHAMPIONSHIPS CRUD ═══════════════════


class ChampionshipCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    season: int = Field(..., ge=2020, le=2030)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool = True


class ChampionshipUpdate(BaseModel):
    name: Optional[str] = None
    season: Optional[int] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/championships")
async def list_championships(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all championships."""
    return await db.championships.find({}, {"_id": 0}).sort("season", -1).to_list(100)


@router.post("/championships")
async def create_championship(
    data: ChampionshipCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new championship."""
    championship = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(UTC).isoformat(),
        "created_by": admin["email"],
    }
    await db.championships.insert_one(championship)
    return {"message": "Championnat cree", "id": championship["id"]}


@router.put("/championships/{champ_id}")
async def update_championship(
    champ_id: str, data: ChampionshipUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a championship."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.championships.update_one({"id": champ_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouve")
    return {"message": "Championnat mis a jour"}


@router.delete("/championships/{champ_id}")
async def delete_championship(
    champ_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a championship."""
    result = await db.championships.delete_one({"id": champ_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouve")
    return {"message": "Championnat supprime"}


# ═══════════════════════════════════════ RACES CRUD ═══════════════════════════


class RaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: str  # ISO date string
    is_sprint: bool = False
    round_number: Optional[int] = None
    season: int = Field(..., ge=2020, le=2030)
    thumbnail_url: Optional[str] = None


class RaceUpdate(BaseModel):
    name: Optional[str] = None
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: Optional[str] = None
    is_sprint: Optional[bool] = None
    round_number: Optional[int] = None
    thumbnail_url: Optional[str] = None
    is_past: Optional[bool] = None


@router.get("/races")
async def list_races(
    season: Optional[int] = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all races, optionally filtered by season."""
    query = {}
    if season:
        query["season"] = season
    return await db.races.find(query, {"_id": 0}).sort("date", 1).to_list(100)


@router.post("/races")
async def create_race(
    data: RaceCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new race event."""
    race = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_past": False,
        "has_results": False,
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.races.insert_one(race)
    return {"message": "Course creee", "id": race["id"]}


@router.put("/races/{race_id}")
async def update_race(
    race_id: str, data: RaceUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a race event."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.races.update_one({"id": race_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course non trouvee")
    return {"message": "Course mise a jour"}


@router.delete("/races/{race_id}")
async def delete_race(
    race_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a race event."""
    result = await db.races.delete_one({"id": race_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course non trouvee")
    return {"message": "Course supprimee"}


# ═══════════════════════════════════════ PREDICTIONS ══════════════════════════


@router.get("/predictions")
async def list_predictions(
    user_id: Optional[str] = None,
    race_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List predictions with filters."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if race_id:
        query["race_id"] = race_id

    total = await db.predictions.count_documents(query)
    predictions = (
        await db.predictions.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"predictions": predictions, "total": total}


# ═══════════════════════════════════════ FEEDBACKS ════════════════════════════


@router.get("/feedbacks")
async def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all feedbacks."""
    query = {}
    if unread_only:
        query["read"] = False
    total = await db.feedback.count_documents(query)
    feedbacks = (
        await db.feedback.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"feedbacks": feedbacks, "total": total}


@router.put("/feedbacks/{feedback_id}/read")
async def mark_feedback_read(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Mark feedback as read."""
    result = await db.feedback.update_one({"id": feedback_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    return {"message": "Marque comme lu"}


@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a feedback entry."""
    result = await db.feedback.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    return {"message": "Feedback supprime"}
