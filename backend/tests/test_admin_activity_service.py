import pytest

from services import admin_activity as admin_activity_service


class FakeActivityLogsCollection:
    def __init__(self) -> None:
        self.inserted: list[dict] = []

    async def insert_one(self, document: dict) -> None:
        self.inserted.append(document)


class FakeActivityDb:
    def __init__(self) -> None:
        self.admin_activity_logs = FakeActivityLogsCollection()


@pytest.mark.asyncio
async def test_log_backoffice_activity_uses_app_activity_schema(monkeypatch):
    monkeypatch.setattr(admin_activity_service, "_now_iso", lambda: "2026-05-29T10:00:00+00:00")
    fake_db = FakeActivityDb()

    activity = await admin_activity_service.log_backoffice_activity(
        {"id": "admin-1", "email": " Admin@PronoKif.eu "},
        action="race.update",
        entity_type="race",
        entity_id="australia-2026",
        metadata={"fields": ["name"]},
        db_handle=fake_db,
    )

    assert activity == fake_db.admin_activity_logs.inserted[0]
    assert activity["actor_id"] == "admin-1"
    assert activity["actor_email"] == "admin@pronokif.eu"
    assert activity["action"] == "race.update"
    assert activity["entity_id"] == "australia-2026"
    assert activity["metadata"] == {"fields": ["name"]}
    assert activity["created_at"] == "2026-05-29T10:00:00+00:00"


@pytest.mark.asyncio
async def test_log_backoffice_activity_ignores_missing_activity_collection():
    activity = await admin_activity_service.log_backoffice_activity(
        {"email": "admin@pronokif.eu"},
        action="noop",
        entity_type="test",
        db_handle=object(),
    )

    assert activity is None
