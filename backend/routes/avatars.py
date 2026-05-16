"""
PRONOKIF - Avatar routes.

    GET  /avatars                — public catalog (no auth, mirrors legacy)
    POST /user/avatar            — switch avatar (id or custom URL)
    POST /user/avatar/upload     — upload a custom image (<= 500KB)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from features import AvatarUpdate
from models.schemas import UserResponse
from services import avatars as avatar_service
from services.auth import get_current_user

router = APIRouter(tags=["avatars"])


@router.get("/avatars")
async def get_available_avatars() -> list[dict]:
    """List all available avatars grouped by category."""
    return avatar_service.list_catalog()


@router.post("/user/avatar", response_model=UserResponse)
async def update_user_avatar(data: AvatarUpdate, user: dict = Depends(get_current_user)):
    """Switch the caller's avatar to a predefined ID or a custom URL."""
    try:
        updated = await avatar_service.set_avatar(
            user["id"],
            avatar_id=data.avatar_id,
            custom_avatar_url=data.custom_avatar_url,
        )
    except avatar_service.AvatarError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return UserResponse(
        id=updated["id"],
        email=updated["email"],
        username=updated.get("username"),
        created_at=updated["created_at"],
        current_league_id=updated.get("current_league_id"),
        xp=updated.get("xp", 0),
        level=updated.get("level", 1),
        avatar_id=updated.get("avatar_id"),
        custom_avatar_url=updated.get("custom_avatar_url"),
    )


@router.post("/user/avatar/upload")
async def upload_custom_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)) -> dict:
    """Upload a custom avatar image; stored inline as a base64 data URL."""
    contents = await file.read()
    try:
        data_url = await avatar_service.upload_custom_avatar(user["id"], contents, file.content_type)
    except avatar_service.AvatarError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"message": "Avatar uploaded", "avatar_url": data_url}
