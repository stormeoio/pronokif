from types import SimpleNamespace

import pytest

from routes import auth as auth_routes


@pytest.mark.asyncio
async def test_session_returns_null_user_without_raising(monkeypatch):
    async def fake_optional_user(_request):
        return None

    monkeypatch.setattr(auth_routes, "get_optional_current_user", fake_optional_user)

    response = await auth_routes.get_session(SimpleNamespace())

    assert response.user is None


@pytest.mark.asyncio
async def test_session_returns_user_when_cookie_is_valid(monkeypatch):
    async def fake_optional_user(_request):
        return {
            "id": "user-1",
            "email": "pilot@example.com",
            "username": "pilot",
            "created_at": "2026-05-29T00:00:00+00:00",
            "xp": 12,
            "level": 2,
            "email_verified": True,
            "locale": "en",
        }

    monkeypatch.setattr(auth_routes, "get_optional_current_user", fake_optional_user)

    response = await auth_routes.get_session(SimpleNamespace())

    assert response.user is not None
    assert response.user.id == "user-1"
    assert response.user.email == "pilot@example.com"
