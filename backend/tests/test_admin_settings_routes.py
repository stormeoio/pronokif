import pytest
from fastapi import HTTPException

from routes import admin_settings


class FakeSettingsCollection:
    def __init__(self, existing: dict | None = None) -> None:
        self.existing = existing
        self.updated: tuple[dict, dict, bool] | None = None

    async def find_one(self, query: dict) -> dict | None:
        return dict(self.existing) if self.existing else None

    async def update_one(self, query: dict, update: dict, *, upsert: bool = False) -> None:
        self.updated = (query, update, upsert)


class FakeSettingsDb:
    def __init__(self, existing: dict | None = None) -> None:
        self.app_settings = FakeSettingsCollection(existing)


def test_default_app_settings_are_admin_pwa_ready():
    settings = admin_settings.default_app_settings()

    assert settings["app_name"] == "Pronokif"
    assert settings["logo_url"] == ""
    assert settings["favicon_url"] == ""
    assert settings["pwa_enabled"] is True
    assert settings["admin_pwa_enabled"] is True
    assert settings["pwa_start_url"] == "/admin"


@pytest.mark.asyncio
async def test_get_settings_returns_defaults_when_missing(monkeypatch):
    monkeypatch.setattr(admin_settings, "db", FakeSettingsDb())

    settings = await admin_settings.get_settings(admin={"email": "admin@pronokif.eu"})

    assert settings == admin_settings.default_app_settings()


@pytest.mark.asyncio
async def test_get_settings_strips_mongo_id(monkeypatch):
    monkeypatch.setattr(admin_settings, "db", FakeSettingsDb({"_id": "global", "app_name": "Stormeo"}))

    settings = await admin_settings.get_settings(admin={"email": "admin@pronokif.eu"})

    assert settings == {"app_name": "Stormeo"}


@pytest.mark.asyncio
async def test_update_settings_uses_non_null_fields(monkeypatch):
    fake_db = FakeSettingsDb()
    monkeypatch.setattr(admin_settings, "db", fake_db)

    response = await admin_settings.update_settings(
        admin_settings.AppSettings(
            app_name="Pronokif 2026",
            logo_url=None,
            favicon_url="/images/branding/app-icon.png",
            pwa_enabled=True,
        ),
        admin={"email": "admin@pronokif.eu"},
    )

    assert response == {"message": "Parametres mis a jour"}
    assert fake_db.app_settings.updated == (
        {"_id": "global"},
        {
            "$set": {
                "app_name": "Pronokif 2026",
                "favicon_url": "/images/branding/app-icon.png",
                "pwa_enabled": True,
            }
        },
        True,
    )


@pytest.mark.asyncio
async def test_update_settings_rejects_empty_payload():
    with pytest.raises(HTTPException) as exc:
        await admin_settings.update_settings(
            admin_settings.AppSettings(),
            admin={"email": "admin@pronokif.eu"},
        )

    assert exc.value.status_code == 400
