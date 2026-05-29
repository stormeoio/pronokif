"""Public legal content routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services.legal_content import get_legal_page, list_legal_pages

router = APIRouter(prefix="/legal", tags=["legal-content"])


@router.get("/pages")
async def get_public_legal_pages(locale: str = "fr") -> dict:
    """List published legal pages."""
    return await list_legal_pages(locale=locale, include_drafts=False)


@router.get("/pages/{slug}")
async def get_public_legal_page(slug: str, locale: str = "fr") -> dict:
    """Get one published legal page by stable slug."""
    page = await get_legal_page(slug, locale=locale, include_drafts=False)
    if not page:
        raise HTTPException(status_code=404, detail="Page légale introuvable")
    return page
