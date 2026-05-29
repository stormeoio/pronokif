"""
PRONOKIF - Admin Back-Office: Knowledge, RAG and circuit maps.

This router owns the admin endpoints that curate the seeded F1 knowledge graph,
refresh document embeddings, and maintain interactive circuit maps.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import log_backoffice_activity
from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.circuit_maps import list_circuit_map_records, update_circuit_map_record
from services.knowledge_seed import (
    build_driver_brief,
    build_prediction_brief,
    build_team_brief,
    claim_knowledge_document,
    claim_knowledge_entity,
    get_driver_knowledge_context,
    get_knowledge_entity,
    get_race_knowledge_context,
    get_team_knowledge_context,
    list_knowledge_documents,
    list_knowledge_entities,
    rebuild_knowledge_embeddings,
    search_knowledge,
    seed_f1_2026_knowledge,
    update_knowledge_document,
    update_knowledge_entity,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-knowledge"])


class KnowledgeEmbeddingRequest(BaseModel):
    force: bool = False
    limit: int = Field(default=500, ge=1, le=2000)
    entity_type: str | None = None
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID


class KnowledgeClaimRequest(BaseModel):
    owner_admin_email: str | None = None
    review_status: str = Field(default="in_review", max_length=50)


class KnowledgeEntityUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    name_translations: dict[str, str] | None = None
    data_status: str | None = Field(default=None, max_length=80)
    review_status: str | None = Field(default=None, max_length=50)
    admin_notes: str | None = Field(default=None, max_length=4000)
    owner_admin_email: str | None = Field(default=None, max_length=320)
    useful_links: list[dict[str, Any]] | None = None
    source_refs: list[str] | None = None
    search_terms: list[str] | None = None
    location: dict[str, Any] | None = None
    circuit: dict[str, Any] | None = None
    base: dict[str, Any] | None = None


class KnowledgeDocumentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    title_translations: dict[str, str] | None = None
    content: str | None = Field(default=None, max_length=20000)
    content_translations: dict[str, str] | None = None
    data_status: str | None = Field(default=None, max_length=80)
    review_status: str | None = Field(default=None, max_length=50)
    admin_notes: str | None = Field(default=None, max_length=4000)
    owner_admin_email: str | None = Field(default=None, max_length=320)
    source_refs: list[str] | None = None
    related_entity_ids: list[str] | None = None


class CircuitMapUpdate(BaseModel):
    map_data: dict[str, Any] | None = None
    data_status: str | None = Field(default=None, max_length=80)
    review_status: str | None = Field(default=None, max_length=50)
    owner_admin_email: str | None = Field(default=None, max_length=320)
    admin_notes: str | None = Field(default=None, max_length=4000)


@router.post("/knowledge/seed-f1-2026")
async def seed_f1_2026_knowledge_base(admin: dict = Depends(get_current_admin)) -> dict:
    """Seed F1 2026 entities and first-pass RAG documents."""
    summary = await seed_f1_2026_knowledge(actor=admin.get("email"))
    return {
        "message": "F1 2026 knowledge base synced",
        **summary,
    }


@router.post("/knowledge/embeddings/rebuild")
async def rebuild_f1_2026_knowledge_embeddings(
    data: KnowledgeEmbeddingRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Build or refresh local deterministic embeddings for RAG documents."""
    return await rebuild_knowledge_embeddings(
        championship_id=data.championship_id,
        entity_type=data.entity_type,
        force=data.force,
        limit=data.limit,
        actor=admin.get("email"),
    )


@router.get("/knowledge/entities")
async def get_knowledge_entities(
    entity_type: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int = 50,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List seeded knowledge entities for admin/RAG inspection."""
    return await list_knowledge_entities(
        championship_id=championship_id,
        entity_type=entity_type,
        q=q,
        skip=skip,
        limit=limit,
    )


@router.get("/knowledge/documents")
async def get_knowledge_documents(
    entity_type: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int = 50,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List generated RAG documents before embeddings are attached."""
    return await list_knowledge_documents(
        championship_id=championship_id,
        entity_type=entity_type,
        q=q,
        skip=skip,
        limit=limit,
    )


@router.get("/circuit-maps")
async def get_circuit_maps(
    q: str = "",
    review_status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List circuit map metadata for admin curation."""
    return await list_circuit_map_records(
        q=q,
        review_status=review_status,
        skip=skip,
        limit=min(max(limit, 1), 100),
    )


@router.put("/circuit-maps/{map_key}")
async def update_circuit_map(
    map_key: str,
    data: CircuitMapUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update an admin-managed circuit map definition and sync circuit RAG entity metadata."""
    try:
        record = await update_circuit_map_record(
            map_key,
            map_data=data.map_data,
            data_status=data.data_status,
            review_status=data.review_status,
            owner_admin_email=data.owner_admin_email,
            admin_notes=data.admin_notes,
            actor=admin.get("email"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not record:
        raise HTTPException(status_code=404, detail="Carte circuit introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="circuit_map.update",
        entity_type="circuit_map",
        entity_id=map_key,
        metadata={
            "review_status": record.get("review_status"),
            "source": record.get("source"),
            "features": len(record.get("map_data", {}).get("features", [])),
            "zones": len(record.get("map_data", {}).get("zones", [])),
        },
    )
    return {"message": "Carte circuit mise à jour", "item": record}


@router.get("/knowledge/search")
async def search_knowledge_documents(
    q: str,
    entity_type: str | None = None,
    limit: int = 20,
    mode: str = "hybrid",
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Lightweight lexical retrieval layer that backs the first MCP tool."""
    return await search_knowledge(
        q=q,
        championship_id=championship_id,
        entity_type=entity_type,
        limit=limit,
        mode=mode,
    )


@router.get("/knowledge/entities/{entity_id}")
async def get_knowledge_entity_detail(
    entity_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Fetch one seeded knowledge entity by stable ID."""
    entity = await get_knowledge_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entité RAG introuvable")
    return entity


@router.put("/knowledge/entities/{entity_id}")
async def update_knowledge_entity_detail(
    entity_id: str,
    data: KnowledgeEntityUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update admin-managed fields for a seeded knowledge entity."""
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    entity = await update_knowledge_entity(entity_id, updates, actor=admin.get("email"))
    if not entity:
        raise HTTPException(status_code=404, detail="Entité RAG introuvable")
    return {"message": "Entité RAG mise à jour", "entity": entity}


@router.post("/knowledge/entities/{entity_id}/claim")
async def claim_knowledge_entity_detail(
    entity_id: str,
    data: KnowledgeClaimRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Assign current admin ownership for review/curation of one entity."""
    entity = await claim_knowledge_entity(
        entity_id,
        actor=admin.get("email"),
        owner_admin_email=data.owner_admin_email,
        review_status=data.review_status,
    )
    if not entity:
        raise HTTPException(status_code=404, detail="Entité RAG introuvable")
    return {"message": "Entité RAG prise en main", "entity": entity}


@router.put("/knowledge/documents/{document_id}")
async def update_knowledge_document_detail(
    document_id: str,
    data: KnowledgeDocumentUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update admin-managed RAG document content and invalidate embeddings."""
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    document = await update_knowledge_document(document_id, updates, actor=admin.get("email"))
    if not document:
        raise HTTPException(status_code=404, detail="Document RAG introuvable")
    return {"message": "Document RAG mis à jour", "document": document}


@router.post("/knowledge/documents/{document_id}/claim")
async def claim_knowledge_document_detail(
    document_id: str,
    data: KnowledgeClaimRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Assign current admin ownership for review/curation of one RAG document."""
    document = await claim_knowledge_document(
        document_id,
        actor=admin.get("email"),
        owner_admin_email=data.owner_admin_email,
        review_status=data.review_status,
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document RAG introuvable")
    return {"message": "Document RAG pris en main", "document": document}


@router.get("/knowledge/races/{race_id}/context")
async def get_race_knowledge_context_endpoint(
    race_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return the RAG entity graph around a race."""
    context = await get_race_knowledge_context(
        race_id=race_id,
        championship_id=championship_id,
    )
    if not context.get("found"):
        raise HTTPException(status_code=404, detail="Contexte RAG de course introuvable")
    return context


@router.get("/knowledge/races/{race_id}/prediction-brief")
async def get_race_prediction_brief(
    race_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Build a prediction brief from the seeded RAG context."""
    brief = await build_prediction_brief(
        race_id=race_id,
        championship_id=championship_id,
    )
    if not brief.get("found"):
        raise HTTPException(status_code=404, detail="Brief RAG de course introuvable")
    return brief


@router.get("/knowledge/teams/{team_id}/context")
async def get_team_knowledge_context_endpoint(
    team_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return the RAG entity graph around a team."""
    context = await get_team_knowledge_context(team_id=team_id, championship_id=championship_id)
    if not context.get("found"):
        raise HTTPException(status_code=404, detail="Contexte RAG d'écurie introuvable")
    return context


@router.get("/knowledge/teams/{team_id}/brief")
async def get_team_brief_endpoint(
    team_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Build a team brief from the seeded RAG context."""
    brief = await build_team_brief(team_id=team_id, championship_id=championship_id)
    if not brief.get("found"):
        raise HTTPException(status_code=404, detail="Brief RAG d'écurie introuvable")
    return brief


@router.get("/knowledge/drivers/{driver_id}/context")
async def get_driver_knowledge_context_endpoint(
    driver_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return the RAG entity graph around a driver."""
    context = await get_driver_knowledge_context(driver_id=driver_id, championship_id=championship_id)
    if not context.get("found"):
        raise HTTPException(status_code=404, detail="Contexte RAG de pilote introuvable")
    return context


@router.get("/knowledge/drivers/{driver_id}/brief")
async def get_driver_brief_endpoint(
    driver_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Build a driver brief from the seeded RAG context."""
    brief = await build_driver_brief(driver_id=driver_id, championship_id=championship_id)
    if not brief.get("found"):
        raise HTTPException(status_code=404, detail="Brief RAG de pilote introuvable")
    return brief
