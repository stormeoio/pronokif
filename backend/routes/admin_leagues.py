"""
PRONOKIF - Admin Back-Office: League Management.

League moderation, analytics, CSV export, member operations and ownership
transfer workflows.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import _now_iso, log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_leagues import (
    dedupe_user_ids,
    enrich_league_docs,
    league_analytics_from_payloads,
    league_search_query,
    reassign_current_league_for_user,
)
from services.league_membership import ensure_leaderboard_entry

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-leagues"])


class LeagueAdminUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    code: str | None = Field(default=None, max_length=24)
    created_by: str | None = Field(default=None, max_length=120)
    members: list[str] | None = None
    admin_note: str | None = Field(default=None, max_length=4000)
    review_status: str | None = Field(default=None, max_length=50)
    is_archived: bool | None = None
    name_translations: dict[str, str] | None = None
    description_translations: dict[str, str] | None = None


class LeagueMemberRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=120)


class LeagueTransferOwnerRequest(BaseModel):
    new_owner_id: str = Field(..., min_length=1, max_length=120)


@router.get("/leagues")
async def list_leagues(
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List leagues with owner and member counts."""
    limit = min(max(limit, 1), 100)
    query = league_search_query(search or "")

    total = await db.leagues.count_documents(query)
    leagues = (
        await db.leagues.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    enriched_leagues = await enrich_league_docs(leagues)

    return {
        "leagues": enriched_leagues,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/leagues/analytics")
async def get_leagues_analytics(
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return league analytics for moderation and community operations."""
    query = league_search_query(search)
    leagues = await db.leagues.find(query, {"_id": 0}).limit(5000).to_list(5000)
    enriched_leagues = await enrich_league_docs(leagues)
    return league_analytics_from_payloads(enriched_leagues)


@router.get("/leagues/export")
async def export_leagues_csv(
    search: str = "",
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export filtered leagues as CSV for admin analysis."""
    limit = min(max(export_limit, 1), 5000)
    leagues = await (
        db.leagues.find(league_search_query(search), {"_id": 0})
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    rows = await enrich_league_docs(leagues)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.export",
        entity_type="league_export",
        entity_id="leagues-csv",
        metadata={"rows": len(rows), "filters": {"search": search}},
    )
    return csv_response(
        "pronokif-leagues.csv",
        rows,
        [
            ("id", "ID ligue"),
            ("name", "Nom"),
            ("code", "Code"),
            ("description", "Description"),
            ("created_by", "Créateur ID"),
            ("owner_email", "Créateur email"),
            ("created_at", "Créée le"),
            ("members_count", "Membres"),
            ("messages_count", "Messages"),
            ("leaderboard_entries_count", "Entrées classement"),
            ("total_points", "Points totaux"),
            ("average_points", "Moyenne points"),
            ("review_status", "Statut revue"),
            ("is_archived", "Archivée"),
            ("admin_note", "Note admin"),
        ],
    )


@router.get("/leagues/{league_id}")
async def get_league_admin_detail(
    league_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return one league with members, owner, leaderboard and chat counts."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")
    enriched = await enrich_league_docs([league])
    return enriched[0]


@router.put("/leagues/{league_id}")
async def update_league_admin(
    league_id: str,
    data: LeagueAdminUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update admin-managed league metadata and moderation fields."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    if "name" in updates:
        name = str(updates["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Le nom de ligue est obligatoire")
        updates["name"] = name

    if "description" in updates and updates["description"] is not None:
        updates["description"] = str(updates["description"]).strip() or None

    if "code" in updates:
        code = str(updates["code"] or "").strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="Le code de ligue est obligatoire")
        existing = await db.leagues.find_one({"code": code, "id": {"$ne": league_id}}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(status_code=400, detail="Ce code de ligue est déjà utilisé")
        updates["code"] = code

    if "members" in updates:
        updates["members"] = dedupe_user_ids(updates["members"])

    if "created_by" in updates and updates["created_by"] is not None:
        owner_id = str(updates["created_by"]).strip()
        owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "id": 1})
        if not owner:
            raise HTTPException(status_code=404, detail="Nouveau créateur introuvable")
        members = dedupe_user_ids(updates.get("members") or league.get("members") or [])
        if owner_id not in members:
            members.append(owner_id)
        updates["created_by"] = owner_id
        updates["members"] = members

    updates["updated_at"] = _now_iso()
    updates["updated_by"] = admin.get("email")
    await db.leagues.update_one({"id": league_id}, {"$set": updates})
    updated_league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    enriched = await enrich_league_docs([updated_league])
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.update",
        entity_type="league",
        entity_id=league_id,
        metadata={"fields": sorted(updates.keys())},
    )
    return {"message": "Ligue mise à jour", "league": enriched[0]}


@router.post("/leagues/{league_id}/members/add")
async def add_league_member_admin(
    league_id: str,
    data: LeagueMemberRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Add a member to a league from the admin back office."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0, "id": 1, "email": 1, "username": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if data.user_id in (league.get("members") or []):
        raise HTTPException(status_code=400, detail="Cet utilisateur est déjà membre")

    await db.leagues.update_one({"id": league_id}, {"$addToSet": {"members": data.user_id}})
    await ensure_leaderboard_entry(league, data.user_id, previous_position=len(league.get("members") or []) + 1)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.member_add",
        entity_type="league",
        entity_id=league_id,
        metadata={"user_id": data.user_id, "email": user.get("email")},
    )
    updated = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    enriched = await enrich_league_docs([updated])
    return {"message": "Membre ajouté", "league": enriched[0]}


@router.post("/leagues/{league_id}/members/remove")
async def remove_league_member_admin(
    league_id: str,
    data: LeagueMemberRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Remove a member from a league and clean linked leaderboard/chat state."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")
    members = dedupe_user_ids(league.get("members") or [])
    if data.user_id not in members:
        raise HTTPException(status_code=400, detail="Cet utilisateur n'est pas membre")

    remaining_members = [member_id for member_id in members if member_id != data.user_id]
    updates: dict[str, Any] = {"members": remaining_members, "updated_at": _now_iso(), "updated_by": admin.get("email")}
    if league.get("created_by") == data.user_id:
        updates["created_by"] = remaining_members[0] if remaining_members else None

    await db.leagues.update_one({"id": league_id}, {"$set": updates})
    await db.leaderboard.delete_one({"league_id": league_id, "user_id": data.user_id})
    await db.chat_read_status.delete_one({"league_id": league_id, "user_id": data.user_id})
    await reassign_current_league_for_user(data.user_id, league_id)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.member_remove",
        entity_type="league",
        entity_id=league_id,
        metadata={"user_id": data.user_id, "new_owner_id": updates.get("created_by")},
    )
    updated = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    enriched = await enrich_league_docs([updated])
    return {"message": "Membre retiré", "league": enriched[0]}


@router.post("/leagues/{league_id}/transfer-owner")
async def transfer_league_owner_admin(
    league_id: str,
    data: LeagueTransferOwnerRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Transfer league ownership from the admin back office."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")
    if data.new_owner_id not in (league.get("members") or []):
        raise HTTPException(status_code=400, detail="Le nouveau créateur doit être membre de la ligue")
    owner = await db.users.find_one({"id": data.new_owner_id}, {"_id": 0, "id": 1, "email": 1, "username": 1})
    if not owner:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    await db.leagues.update_one(
        {"id": league_id},
        {"$set": {"created_by": data.new_owner_id, "updated_at": _now_iso(), "updated_by": admin.get("email")}},
    )
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.transfer_owner",
        entity_type="league",
        entity_id=league_id,
        metadata={"new_owner_id": data.new_owner_id, "email": owner.get("email")},
    )
    updated = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    enriched = await enrich_league_docs([updated])
    return {"message": "Propriété transférée", "league": enriched[0]}


@router.delete("/leagues/{league_id}")
async def delete_league_admin(
    league_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Delete a league and clean its leaderboard, chat messages and read state."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="Ligue introuvable")

    for member_id in league.get("members") or []:
        await reassign_current_league_for_user(member_id, league_id)

    await db.league_messages.delete_many({"league_id": league_id})
    await db.leaderboard.delete_many({"league_id": league_id})
    await db.chat_read_status.delete_many({"league_id": league_id})
    await db.leagues.delete_one({"id": league_id})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="league.delete",
        entity_type="league",
        entity_id=league_id,
        metadata={
            "name": league.get("name"),
            "code": league.get("code"),
            "members_count": len(league.get("members") or []),
        },
    )
    return {"message": "Ligue supprimée"}
