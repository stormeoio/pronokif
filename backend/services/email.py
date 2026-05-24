"""
PRONOKIF - Email delivery helpers.

Central SMTP transport used by public auth emails and admin back-office emails.
When SMTP_HOST is not configured, callers get False and can log a dev fallback.
"""

from __future__ import annotations

import asyncio
import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr

from config import logger

_TRUE_VALUES = {"1", "true", "yes", "y", "on"}
_FALSE_VALUES = {"0", "false", "no", "n", "off"}


@dataclass(frozen=True)
class SMTPSettings:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool
    timeout_seconds: float


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default

    value = raw.strip().lower()
    if value in _TRUE_VALUES:
        return True
    if value in _FALSE_VALUES:
        return False

    logger.warning("[Email] Invalid boolean value for %s=%r; using %s", key, raw, default)
    return default


def _env_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None or raw.strip() == "":
        return default

    try:
        return int(raw)
    except ValueError:
        logger.warning("[Email] Invalid integer value for %s=%r; using %s", key, raw, default)
        return default


def _env_float(key: str, default: float) -> float:
    raw = os.environ.get(key)
    if raw is None or raw.strip() == "":
        return default

    try:
        return float(raw)
    except ValueError:
        logger.warning("[Email] Invalid float value for %s=%r; using %s", key, raw, default)
        return default


def get_smtp_settings() -> SMTPSettings | None:
    """Read SMTP settings from environment, returning None when email is disabled."""
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return None

    return SMTPSettings(
        host=host,
        port=_env_int("SMTP_PORT", 587),
        username=os.environ.get("SMTP_USER", "").strip(),
        password=os.environ.get("SMTP_PASS", ""),
        from_email=os.environ.get("SMTP_FROM", "noreply@pronokif.stormeo.io").strip(),
        from_name=os.environ.get("SMTP_FROM_NAME", "PronoKif").strip(),
        use_tls=_env_bool("SMTP_USE_TLS", True),
        use_ssl=_env_bool("SMTP_USE_SSL", False),
        timeout_seconds=_env_float("SMTP_TIMEOUT_SECONDS", 15.0),
    )


def is_smtp_enabled() -> bool:
    """Return True when SMTP_HOST is configured."""
    return get_smtp_settings() is not None


async def send_email(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    *,
    raise_on_error: bool = False,
) -> bool:
    """
    Send an email through SMTP.

    Returns True when sent, False when SMTP is disabled or a non-fatal send error
    occurs. Set raise_on_error=True for admin flows that should fail loudly when
    SMTP is configured but broken.
    """
    settings = get_smtp_settings()
    if settings is None:
        logger.info("[Email] SMTP_HOST not configured; skipped email to %s (%s)", to_email, subject)
        return False

    try:
        await asyncio.to_thread(_send_email_sync, settings, to_email, subject, text_body, html_body)
    except Exception:
        logger.exception("[Email] Failed to send email to %s (%s)", to_email, subject)
        if raise_on_error:
            raise
        return False

    logger.info("[Email] Sent email to %s (%s)", to_email, subject)
    return True


def _send_email_sync(
    settings: SMTPSettings,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.from_name, settings.from_email))
    msg["To"] = to_email
    msg.set_content(text_body)

    if html_body:
        msg.add_alternative(html_body, subtype="html")

    if settings.use_ssl:
        with smtplib.SMTP_SSL(
            settings.host,
            settings.port,
            timeout=settings.timeout_seconds,
        ) as server:
            _deliver(server, settings, msg)
        return

    with smtplib.SMTP(
        settings.host,
        settings.port,
        timeout=settings.timeout_seconds,
    ) as server:
        if settings.use_tls:
            server.starttls()
        _deliver(server, settings, msg)


def _deliver(server: smtplib.SMTP, settings: SMTPSettings, msg: EmailMessage) -> None:
    if bool(settings.username) != bool(settings.password):
        raise RuntimeError("SMTP_USER and SMTP_PASS must both be configured, or both left empty.")

    if settings.username and settings.password:
        server.login(settings.username, settings.password)

    server.send_message(msg)
