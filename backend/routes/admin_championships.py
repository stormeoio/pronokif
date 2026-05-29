"""
PRONOKIF - Admin Back-Office: Championship Management.

Championship CRUD and canonical Formula 1 2026 seeding/linking.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import _now_iso, log_backoffice_activity
from services.admin_championships import (
    championship_create_doc,
    championship_update_payload,
    championship_with_counts,
)
from services.admin_races import race_doc_from_static
from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    backfill_f1_2026_entity_links,
    ensure_f1_2026_championship,
)
from services.race_calendar import active_2026_races

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-championships"])


class ChampionshipCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    season: int = Field(..., ge=2020, le=2030)
    description: str | None = None
    thumbnail_url: str | None = None
    is_active: bool = True
    slug: str | None = None
    series: str | None = None
    name_translations: dict[str, str] | None = None
    description_translations: dict[str, str] | None = None
    race_ids: list[str] | None = None


class ChampionshipUpdate(BaseModel):
    name: str | None = None
    season: int | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    is_active: bool | None = None
    slug: str | None = None
    series: str | None = None
    name_translations: dict[str, str] | None = None
    description_translations: dict[str, str] | None = None
    race_ids: list[str] | None = None


@router.get("/championships")
async def list_championships(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all championships."""
    championships = await db.championships.find({}, {"_id": 0}).sort("season", -1).to_list(100)
    return [await championship_with_counts(championship) for championship in championships]


@router.post("/championships/seed-f1-2026")
async def seed_f1_2026_championship(admin: dict = Depends(get_current_admin)) -> dict:
    """Create/update the canonical Formula 1 2026 championship and links."""
    races = active_2026_races()
    championship = await ensure_f1_2026_championship(
        races=races,
        actor=admin.get("email"),
    )
    race_ids = championship["race_ids"]
    inserted = 0
    updated = 0
    now = _now_iso()
    for index, race in enumerate(races, start=1):
        race_doc = race_doc_from_static(race, index)
        result = await db.races.update_one(
            {"id": race_doc["id"]},
            {
                "$set": {
                    **race_doc,
                    "updated_at": now,
                    "updated_by": admin.get("email"),
                },
                "$setOnInsert": {"created_at": now, "created_by": admin.get("email")},
            },
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    backfilled = await backfill_f1_2026_entity_links(race_ids=race_ids)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="championship.seed_f1_2026",
        entity_type="championship",
        entity_id=F1_2026_CHAMPIONSHIP_ID,
        metadata={"race_ids": race_ids, "inserted": inserted, "updated": updated, "backfilled": backfilled},
    )
    return {
        "message": "F1 2026 championship synced",
        "championship": await championship_with_counts(championship),
        "inserted": inserted,
        "updated": updated,
        "backfilled": backfilled,
    }


@router.post("/championships")
async def create_championship(
    data: ChampionshipCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new championship."""
    championship = championship_create_doc(data, now=_now_iso(), actor_email=admin.get("email"))
    await db.championships.insert_one(championship)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="championship.create",
        entity_type="championship",
        entity_id=championship["id"],
        metadata={"name": championship.get("name"), "season": championship.get("season")},
    )
    return {"message": "Championship created", "id": championship["id"]}


@router.put("/championships/{champ_id}")
async def update_championship(
    champ_id: str, data: ChampionshipUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a championship."""
    updates = championship_update_payload(data, now=_now_iso(), actor_email=admin.get("email"))
    result = await db.championships.update_one({"id": champ_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Championnat introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="championship.update",
        entity_type="championship",
        entity_id=champ_id,
        metadata={"fields": sorted(updates.keys())},
    )
    return {"message": "Championship updated"}


@router.delete("/championships/{champ_id}")
async def delete_championship(
    champ_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a championship."""
    linked_races = await db.races.count_documents({"championship_id": champ_id})
    if linked_races:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer un championnat lié à des courses",
        )
    result = await db.championships.delete_one({"id": champ_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Championnat introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="championship.delete",
        entity_type="championship",
        entity_id=champ_id,
        metadata={},
    )
    return {"message": "Championship deleted"}
