"""
PRONOKIF - Admin Back-Office: Drivers & Teams Management.

CRUD for the F1 2026 driver grid. Uses a MongoDB ``drivers`` collection
that is seeded on-demand from the static ``F1_DRIVERS_2026`` catalogue
(same data the public /drivers endpoint serves). Admin can override any
field — team assignment, race number, active status, photo URL, etc.

Endpoints (all under /admin-bo, require admin auth):
  GET  /drivers           — list with optional query/team filter
  POST /drivers/seed      — seed/reset from static F1_DRIVERS_2026 data
  GET  /drivers/{id}      — single driver
  PUT  /drivers/{id}      — full update
  POST /drivers           — create a custom driver entry
  DELETE /drivers/{id}    — delete (soft-delete via active=false recommended)
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from data.f1_data import F1_DRIVERS_2026
from routes.admin_auth import get_current_admin
from services.admin_activity import log_backoffice_activity

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-drivers"])


# ── Pydantic models ────────────────────────────────────────────────────────


class DriverCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    name: str = Field(..., min_length=1, max_length=200)
    team: str = Field(..., min_length=1, max_length=100)
    number: int = Field(..., ge=0, le=99)
    country: str = Field(default="", max_length=10)
    code: str | None = Field(default=None, max_length=5)
    photo_url: str | None = None
    photo_url_dark: str | None = None
    photo_url_light: str | None = None
    team_logo_url: str | None = None
    active: bool = True
    notes: str | None = None


class DriverUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    team: str | None = Field(default=None, min_length=1, max_length=100)
    number: int | None = Field(default=None, ge=0, le=99)
    country: str | None = Field(default=None, max_length=10)
    code: str | None = Field(default=None, max_length=5)
    photo_url: str | None = None
    photo_url_dark: str | None = None
    photo_url_light: str | None = None
    team_logo_url: str | None = None
    active: bool | None = None
    notes: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _driver_to_doc(d: dict) -> dict:
    """Normalise a static F1_DRIVERS_2026 entry into a DB document shape.

    F1_DRIVERS_2026 now carries ``photo_url`` and ``team_logo_url`` directly
    so the seed populates media fields without a separate lookup.
    """
    return {
        "_id": d["id"],
        "id": d["id"],
        "name": d.get("name", ""),
        "team": d.get("team", ""),
        "number": d.get("number", 0),
        "country": d.get("country", ""),
        "code": d.get("code"),
        "photo_url": d.get("photo_url"),
        "team_logo_url": d.get("team_logo_url"),
        "active": True,
        "notes": None,
        "seeded": True,
        "updated_at": _now_iso(),
        "created_at": _now_iso(),
    }


def _doc_to_out(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ── Routes ─────────────────────────────────────────────────────────────────


@router.get("/drivers")
async def list_drivers(
    q: str | None = None,
    team: str | None = None,
    active_only: bool = False,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all drivers with optional search and team filter."""
    filt: dict = {}
    if q:
        import re

        pattern = re.compile(re.escape(q), re.IGNORECASE)
        filt["$or"] = [{"name": pattern}, {"team": pattern}, {"code": pattern}]
    if team:
        filt["team"] = team
    if active_only:
        filt["active"] = True

    docs = await db.drivers.find(filt).sort([("team", 1), ("number", 1)]).to_list(length=200)
    return [_doc_to_out(d) for d in docs]


@router.post("/drivers/seed")
async def seed_drivers(
    force: bool = False,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Seed the drivers collection from the static F1_DRIVERS_2026 catalogue.

    By default, skips drivers that already exist (upsert by id).
    Pass ?force=true to overwrite all fields even for existing entries.
    """
    seeded = 0
    skipped = 0
    for d in F1_DRIVERS_2026:
        doc = _driver_to_doc(d)
        if force:
            await db.drivers.replace_one({"_id": d["id"]}, doc, upsert=True)
            seeded += 1
        else:
            existing = await db.drivers.find_one({"_id": d["id"]})
            if existing:
                skipped += 1
            else:
                await db.drivers.insert_one(doc)
                seeded += 1

    await log_backoffice_activity(
        admin_email=admin.get("email", "unknown"),
        action="drivers.seed",
        details={"seeded": seeded, "skipped": skipped, "force": force},
    )
    return {"seeded": seeded, "skipped": skipped, "total": len(F1_DRIVERS_2026)}


@router.get("/drivers/{driver_id}")
async def get_driver_admin(
    driver_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    doc = await db.drivers.find_one({"_id": driver_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Pilote introuvable")
    return _doc_to_out(doc)


@router.post("/drivers")
async def create_driver(
    payload: DriverCreate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    existing = await db.drivers.find_one({"_id": payload.id})
    if existing:
        raise HTTPException(status_code=409, detail=f"Un pilote avec l'id '{payload.id}' existe déjà")

    doc = {
        "_id": payload.id,
        **payload.model_dump(),
        "seeded": False,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.drivers.insert_one(doc)
    await log_backoffice_activity(
        admin_email=admin.get("email", "unknown"),
        action="driver.create",
        details={"driver_id": payload.id, "name": payload.name},
    )
    return _doc_to_out(doc)


@router.put("/drivers/{driver_id}")
async def update_driver(
    driver_id: str,
    payload: DriverUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    doc = await db.drivers.find_one({"_id": driver_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Pilote introuvable")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return _doc_to_out(doc)

    updates["updated_at"] = _now_iso()
    await db.drivers.update_one({"_id": driver_id}, {"$set": updates})

    updated = await db.drivers.find_one({"_id": driver_id})
    await log_backoffice_activity(
        admin_email=admin.get("email", "unknown"),
        action="driver.update",
        details={"driver_id": driver_id, "fields": list(updates.keys())},
    )
    return _doc_to_out(updated)


@router.post("/drivers/sync-avatars")
async def sync_driver_avatars(
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Ensure every DRIVER_AVATARS entry has a matching driver in DB.

    For each static DRIVER_AVATAR, we find the DB driver by race number
    and confirm photo_url is set. Returns a summary of how many pilots
    have an avatar-ready photo and how many are still missing one.
    """
    from data.avatars import DRIVER_AVATARS
    from data.f1_data import F1_DRIVERS_2026
    from services.drivers import DRIVER_PHOTOS

    ready = 0
    missing = []

    for av in DRIVER_AVATARS:
        number = av.get("number")
        if number is None:
            continue
        # Find driver in DB by race number
        doc = await db.drivers.find_one({"number": int(number)})
        if doc and doc.get("photo_url"):
            ready += 1
        else:
            # If not in DB or missing photo, try to find in F1_DRIVERS_2026 and upsert
            static = next((d for d in F1_DRIVERS_2026 if d.get("number") == int(number)), None)
            if static:
                photo = static.get("photo_url") or DRIVER_PHOTOS.get(static["id"])
                logo = static.get("team_logo_url")
                if photo:
                    await db.drivers.update_one(
                        {"_id": static["id"]},
                        {"$set": {
                            "photo_url": photo,
                            "team_logo_url": logo,
                            "updated_at": _now_iso(),
                        }},
                        upsert=False,  # Only update existing — run /seed first
                    )
                    ready += 1
                else:
                    missing.append({"number": number, "name": av.get("name")})
            else:
                missing.append({"number": number, "name": av.get("name")})

    await log_backoffice_activity(
        admin_email=admin.get("email", "unknown"),
        action="drivers.sync_avatars",
        details={"ready": ready, "missing": len(missing)},
    )
    return {"ready": ready, "missing": missing, "total": len(DRIVER_AVATARS)}


@router.delete("/drivers/{driver_id}")
async def delete_driver(
    driver_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    doc = await db.drivers.find_one({"_id": driver_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Pilote introuvable")

    await db.drivers.delete_one({"_id": driver_id})
    await log_backoffice_activity(
        admin_email=admin.get("email", "unknown"),
        action="driver.delete",
        details={"driver_id": driver_id, "name": doc.get("name")},
    )
    return {"deleted": driver_id}
