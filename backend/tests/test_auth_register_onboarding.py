from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response

from models.schemas import UserCreate
from routes import auth as auth_routes


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    async def find_one(self, query, projection=None):
        if "username" in query:
            excluded_id = query.get("id", {}).get("$ne")
            return next(
                (
                    doc
                    for doc in self.docs
                    if doc.get("username") == query["username"] and doc.get("id") != excluded_id
                ),
                None,
            )
        if "email" in query:
            pattern = query["email"].get("$regex", "").strip("^$")
            return next(
                (doc for doc in self.docs if doc.get("email", "").lower() == pattern.lower()),
                None,
            )
        return None

    async def insert_one(self, doc):
        self.docs.append(doc)
        return SimpleNamespace(inserted_id=doc.get("id"))

    async def update_one(self, query, update):
        return SimpleNamespace(modified_count=0)


class FakeDb:
    def __init__(self, users=None):
        self.users = FakeCollection(users)
        self.invitations = FakeCollection()
        self.user_stats = FakeCollection()


@pytest.mark.asyncio
async def test_register_persists_username_for_onboarding(monkeypatch):
    async def fake_send_verification_email(*args, **kwargs):
        return True

    fake_db = FakeDb()
    monkeypatch.setattr(auth_routes, "db", fake_db)
    monkeypatch.setattr(auth_routes, "send_verification_email", fake_send_verification_email)
    monkeypatch.setattr(auth_routes, "create_access_token", lambda user_id: f"access-{user_id}")
    monkeypatch.setattr(auth_routes, "create_refresh_token", lambda user_id: f"refresh-{user_id}")

    response = await auth_routes.register.__wrapped__(
        SimpleNamespace(),
        UserCreate(email="pilot@example.com", password="Password123!", username=" PilotFlow "),
        Response(),
    )

    assert response.user.username == "PilotFlow"
    assert fake_db.users.docs[0]["username"] == "PilotFlow"


@pytest.mark.asyncio
async def test_register_rejects_taken_username(monkeypatch):
    fake_db = FakeDb(users=[{"id": "existing", "email": "old@example.com", "username": "PilotFlow"}])
    monkeypatch.setattr(auth_routes, "db", fake_db)

    with pytest.raises(HTTPException) as exc:
        await auth_routes.register.__wrapped__(
            SimpleNamespace(),
            UserCreate(email="pilot@example.com", password="Password123!", username="PilotFlow"),
            Response(),
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Ce pseudo est déjà pris"
