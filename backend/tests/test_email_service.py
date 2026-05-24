import os

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "pronokif_test")
os.environ.setdefault("JWT_SECRET", "x" * 48)

from services import email as email_service  # noqa: E402


@pytest.mark.asyncio
async def test_send_email_returns_false_when_smtp_is_disabled(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)

    sent = await email_service.send_email(
        "pilot@example.com",
        "Subject",
        "Text body",
    )

    assert sent is False


@pytest.mark.asyncio
async def test_send_email_uses_smtp_settings(monkeypatch):
    calls: list[tuple] = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: float):
            calls.append(("connect", host, port, timeout))

        def __enter__(self):
            calls.append(("enter",))
            return self

        def __exit__(self, exc_type, exc, tb):
            calls.append(("exit", exc_type))

        def starttls(self):
            calls.append(("starttls",))

        def login(self, username: str, password: str):
            calls.append(("login", username, password))

        def send_message(self, msg):
            calls.append(("send_message", msg["To"], msg["Subject"], msg["From"]))

    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "2525")
    monkeypatch.setenv("SMTP_USER", "smtp-user")
    monkeypatch.setenv("SMTP_PASS", "smtp-pass")
    monkeypatch.setenv("SMTP_FROM", "noreply@example.com")
    monkeypatch.setenv("SMTP_FROM_NAME", "PronoKif")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    monkeypatch.setenv("SMTP_USE_SSL", "false")
    monkeypatch.setenv("SMTP_TIMEOUT_SECONDS", "9.5")

    sent = await email_service.send_email(
        "pilot@example.com",
        "Grid ready",
        "Plain text",
        "<p>HTML</p>",
    )

    assert sent is True
    assert calls == [
        ("connect", "smtp.example.com", 2525, 9.5),
        ("enter",),
        ("starttls",),
        ("login", "smtp-user", "smtp-pass"),
        ("send_message", "pilot@example.com", "Grid ready", "PronoKif <noreply@example.com>"),
        ("exit", None),
    ]


@pytest.mark.asyncio
async def test_send_email_raises_when_configured_to_fail_loudly(monkeypatch):
    class BrokenSMTP:
        def __init__(self, *args, **kwargs):
            raise OSError("connection failed")

    monkeypatch.setattr(email_service.smtplib, "SMTP", BrokenSMTP)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASS", raising=False)

    with pytest.raises(OSError):
        await email_service.send_email(
            "pilot@example.com",
            "Subject",
            "Text body",
            raise_on_error=True,
        )
