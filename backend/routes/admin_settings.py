"""
PRONOKIF - Admin Back-Office: App Settings.

Global application and PWA settings managed from the admin workspace.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import db
from routes.admin_auth import get_current_admin

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-settings"])


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
    pwa_enabled: bool | None = None
    admin_pwa_enabled: bool | None = None
    pwa_start_url: str | None = None


def default_app_settings() -> dict:
    return {
        "app_name": "Pronokif",
        "app_description": "F1 prediction game",
        "primary_color": "#f97316",
        "accent_color": "#06b6d4",
        "maintenance_mode": False,
        "registration_open": True,
        "max_leagues_per_user": 5,
        "current_season": 2025,
        "pwa_enabled": True,
        "admin_pwa_enabled": True,
        "pwa_start_url": "/admin",
    }


@router.get("/settings")
async def get_settings(admin: dict = Depends(get_current_admin)) -> dict:
    """Get app settings."""
    settings = await db.app_settings.find_one({"_id": "global"})
    if not settings:
        return default_app_settings()
    settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_settings(
    data: AppSettings, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update app settings."""
    updates = {key: value for key, value in data.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": updates},
        upsert=True,
    )
    return {"message": "Parametres mis a jour"}
