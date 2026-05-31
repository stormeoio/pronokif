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
public_router = APIRouter(prefix="/settings", tags=["app-settings"])

APP_NAME = "PronoKif"
BRANDING_FIELDS = (
    "app_name",
    "primary_color",
    "accent_color",
    "logo_url",
    "wordmark_dark_url",
    "wordmark_light_url",
    "symbol_dark_url",
    "symbol_light_url",
    "app_icon_url",
    "favicon_url",
    "apple_touch_icon_url",
    "pwa_icon_192_url",
    "pwa_icon_512_url",
)


class AppSettings(BaseModel):
    app_name: str | None = None
    app_description: str | None = None
    primary_color: str | None = None
    accent_color: str | None = None
    logo_url: str | None = None
    wordmark_dark_url: str | None = None
    wordmark_light_url: str | None = None
    symbol_dark_url: str | None = None
    symbol_light_url: str | None = None
    app_icon_url: str | None = None
    favicon_url: str | None = None
    apple_touch_icon_url: str | None = None
    pwa_icon_192_url: str | None = None
    pwa_icon_512_url: str | None = None
    maintenance_mode: bool | None = None
    registration_open: bool | None = None
    max_leagues_per_user: int | None = None
    current_season: int | None = None
    pwa_enabled: bool | None = None
    admin_pwa_enabled: bool | None = None
    pwa_start_url: str | None = None


def default_app_settings() -> dict:
    return {
        "app_name": APP_NAME,
        "app_description": "F1 prediction game",
        "primary_color": "#E10600",
        "accent_color": "#f59e0b",
        "logo_url": "/brand/pronokif-v1/logo-pronokif-markdown-white-red.svg",
        "wordmark_dark_url": "/brand/pronokif-v1/logo-pronokif-markdown-white-red.svg",
        "wordmark_light_url": "/brand/pronokif-v1/logo-pronokif-markdown-black-red.svg",
        "symbol_dark_url": "/brand/pronokif-v1/logo-pronokif-symbole-white-red.svg",
        "symbol_light_url": "/brand/pronokif-v1/logo-pronokif-symbole-black-red.svg",
        "app_icon_url": "/icons/icon-pronokif-v1-512.png",
        "favicon_url": "/icons/favicon-pronokif-v1-32.png",
        "apple_touch_icon_url": "/icons/apple-touch-icon-pronokif-v1.png",
        "pwa_icon_192_url": "/icons/icon-pronokif-v1-192.png",
        "pwa_icon_512_url": "/icons/icon-pronokif-v1-512.png",
        "maintenance_mode": False,
        "registration_open": True,
        "max_leagues_per_user": 5,
        "current_season": 2026,
        "pwa_enabled": True,
        "admin_pwa_enabled": True,
        "pwa_start_url": "/admin",
    }


async def _get_merged_settings() -> dict:
    settings = await db.app_settings.find_one({"_id": "global"})
    merged = default_app_settings()
    if settings:
        settings.pop("_id", None)
        merged.update(settings)
    merged["app_name"] = APP_NAME
    return merged


@router.get("/settings")
async def get_settings(admin: dict = Depends(get_current_admin)) -> dict:
    """Get app settings."""
    return await _get_merged_settings()


@router.put("/settings")
async def update_settings(data: AppSettings, admin: dict = Depends(get_current_admin)) -> dict:
    """Update app settings."""
    updates = {
        key: value
        for key, value in data.model_dump().items()
        if value is not None and key != "app_name"
    }
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    updates["app_name"] = APP_NAME
    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": updates},
        upsert=True,
    )
    return {"message": "Parametres mis a jour"}


@public_router.get("/branding")
async def get_public_branding_settings() -> dict:
    """Return public branding values used by the frontend theme shell."""
    settings = await _get_merged_settings()
    return {key: settings.get(key) for key in BRANDING_FIELDS}
