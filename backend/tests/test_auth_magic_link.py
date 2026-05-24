import os

import jwt
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pronokif_test")
os.environ.setdefault("JWT_SECRET", "x" * 48)

from config import JWT_ALGORITHM, JWT_SECRET  # noqa: E402
from services import auth as auth_service  # noqa: E402


def test_create_magic_login_token_contains_one_time_claims():
    token, token_id = auth_service.create_magic_login_token("user-123")

    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

    assert payload["sub"] == "user-123"
    assert payload["type"] == "user_magic_link"
    assert payload["jti"] == token_id


@pytest.mark.asyncio
async def test_send_magic_login_email_uses_frontend_magic_link(monkeypatch):
    calls: list[tuple[str, str, str, str | None]] = []

    async def fake_send_email(to_email, subject, text_body, html_body=None):
        calls.append((to_email, subject, text_body, html_body))
        return True

    monkeypatch.setattr(auth_service, "send_email", fake_send_email)
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/")

    await auth_service.send_magic_login_email("pilot@example.com", "token-abc")

    assert len(calls) == 1
    to_email, subject, text_body, html_body = calls[0]
    assert to_email == "pilot@example.com"
    assert subject == "PronoKif - Ton lien magique"
    assert "https://app.example.com/auth?magic_token=token-abc" in text_body
    assert html_body is not None
    assert "https://app.example.com/auth?magic_token=token-abc" in html_body
