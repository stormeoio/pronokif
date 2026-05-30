"""
PRONOKIF - Admin Back-Office: Translation registry.

Central read/write surface for translation-ready content fields. New public
content sources should be registered here when they expose locale-keyed copy.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import log_backoffice_activity
from services.translations_registry import (
    SUPPORTED_LOCALES,
    build_translation_registry,
    update_translation_value,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-translations"])


class TranslationUpdate(BaseModel):
    field: str = Field(..., min_length=1, max_length=80)
    locale: str = Field(..., min_length=2, max_length=8)
    value: str = Field(default="", max_length=50000)


@router.get("/translations/registry")
async def get_translation_registry(
    source: str | None = None,
    q: str = "",
    locale: str | None = Query(default=None, pattern="^(fr|en)$"),
    missing_only: bool = False,
    limit: int = Query(default=500, ge=1, le=2000),
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Return translation completion and editable registered fields."""
    return await build_translation_registry(
        db,
        source=source,
        q=q,
        locale=locale,
        missing_only=missing_only,
        limit=limit,
    )


@router.put("/translations/registry/{source}/{document_id}")
async def update_registry_translation(
    source: str,
    document_id: str,
    data: TranslationUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update one locale value on a registered translation field."""
    if data.locale not in SUPPORTED_LOCALES:
        raise HTTPException(status_code=400, detail="Langue non supportée")
    try:
        document = await update_translation_value(
            db,
            source=source,
            document_id=document_id,
            field=data.field,
            locale=data.locale,
            value=data.value,
            actor=admin.get("email"),
        )
    except ValueError as exc:
        detail = {
            "unknown_source": "Source de traduction inconnue",
            "unknown_field": "Champ de traduction inconnu pour cette source",
            "unknown_locale": "Langue non supportée",
        }.get(str(exc), "Requête de traduction invalide")
        raise HTTPException(status_code=400, detail=detail) from exc

    if not document:
        raise HTTPException(status_code=404, detail="Contenu introuvable")

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="translation.update",
        entity_type=source,
        entity_id=document_id,
        metadata={"field": data.field, "locale": data.locale},
    )
    return {"message": "Traduction mise à jour", "document": document}
