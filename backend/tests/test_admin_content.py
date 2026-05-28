import pytest
import fastapi.dependencies.utils as fastapi_dependency_utils

fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None
from routes import admin_content as admin_content_routes


class FakeInvitationsCollection:
    def __init__(self, existing: dict[str, dict] | None = None) -> None:
        self.existing = existing or {}
        self.inserted: list[dict] = []

    async def find_one(self, query: dict) -> dict | None:
        return self.existing.get(query["email"])

    async def insert_one(self, doc: dict) -> None:
        self.inserted.append(doc)


class FakeDb:
    def __init__(self, existing: dict[str, dict] | None = None) -> None:
        self.invitations = FakeInvitationsCollection(existing)


@pytest.mark.asyncio
async def test_send_invitations_batch_dedupes_and_skips_pending(monkeypatch):
    fake_db = FakeDb({"old@example.com": {"email": "old@example.com", "accepted": False}})
    sent_emails: list[str] = []

    async def fake_send(email: str, invite_url: str, message: str | None) -> bool:
        sent_emails.append(email)
        assert invite_url.startswith("http")
        assert message == "Bienvenue dans le paddock"
        return True

    monkeypatch.setattr(admin_content_routes, "db", fake_db)
    monkeypatch.setattr(admin_content_routes, "_send_invitation_email", fake_send)

    data = admin_content_routes.InvitationBatchSend(
        emails=[
            "pilot@example.com",
            "Pilot@example.com",
            "old@example.com",
            "crew@example.com",
        ],
        message="Bienvenue dans le paddock",
    )

    result = await admin_content_routes.send_invitations_batch(
        data,
        admin={"email": "admin@pronokif.eu"},
    )

    assert result["sent"] == 2
    assert {doc["email"] for doc in fake_db.invitations.inserted} == {
        "pilot@example.com",
        "crew@example.com",
    }
    assert sent_emails == ["pilot@example.com", "crew@example.com"]
    assert result["skipped"] == [
        {"email": "pilot@example.com", "reason": "duplicate in batch"},
        {"email": "old@example.com", "reason": "invitation already pending"},
    ]
