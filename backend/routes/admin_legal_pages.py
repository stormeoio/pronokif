"""
PRONOKIF - Admin Back-Office: Legal Pages.

Translation-ready legal page seeding, listing and editing for the admin
workspace.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from routes.admin_auth import get_current_admin
from services.legal_content import (
    ensure_default_legal_pages,
    list_legal_pages,
    update_legal_page,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-legal-pages"])


class LegalPageUpdate(BaseModel):
    title_translations: dict[str, str] | None = None
    summary_translations: dict[str, str] | None = None
    content_translations: dict[str, str] | None = None
    status: str | None = None
    version: str | None = None
    order: int | None = None


@router.post("/legal-pages/seed-defaults")
async def seed_legal_pages(admin: dict = Depends(get_current_admin)) -> dict:
    """Create missing legal pages with translation-ready defaults."""
    summary = await ensure_default_legal_pages(actor=admin.get("email"))
    return {"message": "Pages légales synchronisées", **summary}


@router.get("/legal-pages")
async def get_legal_pages(
    locale: str = "fr",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List legal pages, including drafts, for BO editing."""
    return await list_legal_pages(locale=locale, include_drafts=True)


@router.put("/legal-pages/{slug}")
async def update_admin_legal_page(
    slug: str,
    data: LegalPageUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update one legal page without changing its stable slug."""
    updates = {key: value for key, value in data.model_dump(exclude_unset=True).items() if value is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    page = await update_legal_page(slug, updates, actor=admin.get("email"))
    if not page:
        raise HTTPException(status_code=404, detail="Page légale introuvable")
    return {"message": "Page légale mise à jour", "page": page}
