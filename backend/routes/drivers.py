"""
PRONOKIF - Driver detail routes.

GET /drivers/all                     — full grid with photos
GET /drivers/compare                 — side-by-side comparison
GET /drivers/{driver_id}/details     — full profile + 10 useful facts

NOTE: basic /drivers and /drivers/{driver_id} are already served by
routes/races.py (lines 41-53). These three richer endpoints live here.

The compare and "all" routes must be registered before the
``/drivers/{driver_id}/details`` parameterised route to avoid being
shadowed by FastAPI's matcher — APIRouter resolves in declaration order.

Mounted by server.py under prefix="/api". No auth required (public
driver catalogue), matching the existing behaviour in server.py.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services import drivers as drivers_service

router = APIRouter(tags=["drivers"])


@router.get("/drivers/all")
async def get_all_drivers_endpoint() -> list[dict]:
    """Return all drivers with basic info and photo URLs."""
    return drivers_service.get_all()


@router.get("/drivers/compare")
async def compare_drivers(driver1: str, driver2: str) -> dict:
    """Compare two drivers side-by-side. 404 if either is unknown."""
    result = drivers_service.compare(driver1, driver2)
    if result is None:
        raise HTTPException(status_code=404, detail="Un ou les deux pilotes introuvables")
    return result


@router.get("/drivers/{driver_id}/details")
async def get_driver_detail_endpoint(driver_id: str) -> dict:
    """Full driver profile (palmares, contract, useful facts). Accepts a
    slug (``verstappen``) or 3-letter code (``VER``)."""
    driver = await drivers_service.get_details(driver_id)
    if driver is None:
        raise HTTPException(status_code=404, detail="Pilote introuvable")
    return driver
