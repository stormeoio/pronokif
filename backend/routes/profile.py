"""
PRONOKIF - Profile, stats & missions routes.

Mounted by server.py under the /api prefix. Paths are absolute below
because they share the /users, /user namespaces with other routers.

    GET  /users/{user_id}/profile        — public profile (auth)
    GET  /user/stats                     — caller's stats
    GET  /user/missions                  — caller's mission progress
    POST /user/missions/{id}/claim       — claim XP reward
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from services import profile as profile_service
from services.auth import get_current_user

router = APIRouter(tags=["profile"])


@router.get("/users/{user_id}/profile")
async def get_user_public_profile(user_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Public profile of a user (stats, common leagues, recent picks)."""
    try:
        return await profile_service.get_public_profile(target_user_id=user_id, requesting_user_id=user["id"])
    except profile_service.UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/user/stats")
async def get_user_stats(user: dict = Depends(get_current_user)) -> dict:
    """Return (and lazily create) the caller's stats document."""
    return await profile_service.get_or_create_stats(user["id"])


@router.get("/user/missions")
async def get_user_missions(user: dict = Depends(get_current_user)) -> dict:
    """Return mission progress grouped by category."""
    return await profile_service.list_missions(user["id"])


@router.post("/user/missions/{mission_id}/claim")
async def claim_mission_reward(mission_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Award XP for a completed mission. 400 if not eligible, 404 if unknown."""
    try:
        return await profile_service.claim_mission(user["id"], mission_id)
    except profile_service.MissionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
