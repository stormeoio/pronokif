import os

import jwt
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pronokif_test")
os.environ.setdefault("JWT_SECRET", "x" * 48)

from config import JWT_ALGORITHM, JWT_SECRET  # noqa: E402
from routes import admin_auth as admin_auth_routes  # noqa: E402
from routes import auth as auth_routes  # noqa: E402
from services import auth as auth_service  # noqa: E402


def test_create_magic_login_token_contains_one_time_claims():
    token, token_id = auth_service.create_magic_login_token("user-123")

    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

    assert payload["sub"] == "user-123"
    assert payload["type"] == "user_magic_link"
    assert payload["jti"] == token_id


def test_user_email_filter_normalizes_and_matches_case_insensitively():
    email_filter = auth_routes._user_email_filter(" Pilot+Test@Example.COM ")

    assert email_filter == {
        "email": {
            "$regex": r"^pilot\+test@example\.com$",
            "$options": "i",
        }
    }


def test_admin_magic_url_targets_backoffice_auth_route(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/")

    magic_url = admin_auth_routes._build_admin_magic_url("admin-token")

    assert magic_url == "https://app.example.com/admin-bo/auth?token=admin-token"


@pytest.mark.asyncio
async def test_send_magic_login_email_uses_frontend_magic_link(monkeypatch):
    calls: list[tuple[str, str, str, str | None]] = []

    async def fake_send_email(to_email, subject, text_body, html_body=None):
        calls.append((to_email, subject, text_body, html_body))
        return True

    monkeypatch.setattr(auth_service, "send_email", fake_send_email)
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/")

    sent = await auth_service.send_magic_login_email("pilot@example.com", "token-abc")

    assert sent is True
    assert len(calls) == 1
    to_email, subject, text_body, html_body = calls[0]
    assert to_email == "pilot@example.com"
    assert subject == "PronoKif - Ton lien magique"
    assert "https://app.example.com/auth?magic_token=token-abc" in text_body
    assert html_body is not None
    assert "https://app.example.com/auth?magic_token=token-abc" in html_body


@pytest.mark.asyncio
async def test_send_reset_email_returns_delivery_status(monkeypatch):
    calls: list[tuple[str, str, str, str | None]] = []

    async def fake_send_email(to_email, subject, text_body, html_body=None):
        calls.append((to_email, subject, text_body, html_body))
        return False

    monkeypatch.setattr(auth_service, "send_email", fake_send_email)
    monkeypatch.setattr(auth_service, "is_smtp_enabled", lambda: True)
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/")

    sent = await auth_service.send_reset_email("pilot@example.com", "reset-token")

    assert sent is False
    assert len(calls) == 1
    to_email, subject, text_body, html_body = calls[0]
    assert to_email == "pilot@example.com"
    assert subject == "PronoKif - Reinitialisation du mot de passe"
    assert "https://app.example.com/reset-password?token=reset-token" in text_body
    assert html_body is not None
    assert "https://app.example.com/reset-password?token=reset-token" in html_body
