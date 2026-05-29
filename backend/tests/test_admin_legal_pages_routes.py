import pytest
from fastapi import HTTPException

from routes import admin_legal_pages


@pytest.mark.asyncio
async def test_seed_legal_pages_passes_admin_actor(monkeypatch):
    async def fake_seed(*, actor: str | None) -> dict:
        return {"actor": actor, "inserted": 2, "updated": 1}

    monkeypatch.setattr(admin_legal_pages, "ensure_default_legal_pages", fake_seed)

    response = await admin_legal_pages.seed_legal_pages(admin={"email": "admin@pronokif.eu"})

    assert response == {
        "message": "Pages légales synchronisées",
        "actor": "admin@pronokif.eu",
        "inserted": 2,
        "updated": 1,
    }


@pytest.mark.asyncio
async def test_get_legal_pages_includes_drafts_for_admin(monkeypatch):
    async def fake_list(*, locale: str, include_drafts: bool) -> dict:
        return {"locale": locale, "include_drafts": include_drafts}

    monkeypatch.setattr(admin_legal_pages, "list_legal_pages", fake_list)

    response = await admin_legal_pages.get_legal_pages(locale="en", admin={"email": "admin@pronokif.eu"})

    assert response == {"locale": "en", "include_drafts": True}


@pytest.mark.asyncio
async def test_update_admin_legal_page_uses_translation_ready_fields(monkeypatch):
    captured: dict = {}

    async def fake_update(slug: str, updates: dict, *, actor: str | None) -> dict:
        captured.update({"slug": slug, "updates": updates, "actor": actor})
        return {"slug": slug, **updates}

    monkeypatch.setattr(admin_legal_pages, "update_legal_page", fake_update)

    response = await admin_legal_pages.update_admin_legal_page(
        "mentions-legales",
        admin_legal_pages.LegalPageUpdate(
            title_translations={"fr": "Mentions légales", "en": "Legal notice"},
            status="published",
        ),
        admin={"email": "admin@pronokif.eu"},
    )

    assert captured == {
        "slug": "mentions-legales",
        "updates": {
            "title_translations": {"fr": "Mentions légales", "en": "Legal notice"},
            "status": "published",
        },
        "actor": "admin@pronokif.eu",
    }
    assert response["page"]["status"] == "published"


@pytest.mark.asyncio
async def test_update_admin_legal_page_rejects_empty_payload():
    with pytest.raises(HTTPException) as exc:
        await admin_legal_pages.update_admin_legal_page(
            "cgu",
            admin_legal_pages.LegalPageUpdate(),
            admin={"email": "admin@pronokif.eu"},
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_update_admin_legal_page_returns_404_when_missing(monkeypatch):
    async def fake_update(slug: str, updates: dict, *, actor: str | None) -> None:
        return None

    monkeypatch.setattr(admin_legal_pages, "update_legal_page", fake_update)

    with pytest.raises(HTTPException) as exc:
        await admin_legal_pages.update_admin_legal_page(
            "missing",
            admin_legal_pages.LegalPageUpdate(status="published"),
            admin={"email": "admin@pronokif.eu"},
        )

    assert exc.value.status_code == 404
