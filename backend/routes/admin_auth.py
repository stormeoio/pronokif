"""
PRONOKIF - Admin Back-Office: Authentication & 2FA.

Magic link auth + optional TOTP 2FA for whitelisted admin emails.
Exports `get_current_admin` dependency used by admin back-office routers.

Endpoints:
  POST /api/admin-bo/auth/magic-link     - send magic link email
  POST /api/admin-bo/auth/verify         - verify magic link token
  POST /api/admin-bo/auth/2fa/setup      - generate TOTP secret
  POST /api/admin-bo/auth/2fa/verify     - verify TOTP code and enable
  POST /api/admin-bo/auth/2fa/validate   - validate TOTP on login
  GET  /api/admin-bo/auth/me             - current admin session
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit, urlunsplit

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from config import JWT_ALGORITHM, JWT_SECRET, db, logger
from services.email import send_email
from services.email_templates import (
    admin_magic_link as admin_magic_link_tpl,
)
from services.email_templates import (
    invitation as invitation_tpl,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-auth"])

# ── Admin whitelist ──────────────────────────────────────────────────────────
ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.environ.get(
        "ADMIN_BACKOFFICE_EMAILS",
        "baptiste.catalan123@gmail.com,catalan.baptiste123@gmail.com,fred@stormeo.io",
    ).split(",")
]

MAGIC_LINK_EXPIRY_MINUTES = 15


def _frontend_url() -> str:
    """Return the configured frontend base URL without a trailing slash."""
    return os.environ.get("FRONTEND_URL", "https://pronokif.eu").rstrip("/")


def _is_dev_environment() -> bool:
    return os.environ.get("ENVIRONMENT", "development").lower() in {"development", "dev", "local"}


def _loopback_origin(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        return None
    netloc = parsed.hostname
    if parsed.port:
        netloc = f"{parsed.hostname}:{parsed.port}"
    return urlunsplit((parsed.scheme, netloc, "", "", "")).rstrip("/")


def _admin_frontend_url(request: Request | None = None) -> str:
    """Return the public admin base URL without a trailing slash."""
    configured = os.environ.get("ADMIN_FRONTEND_URL")
    if configured:
        return configured.rstrip("/")

    if request and _is_dev_environment():
        origin = _loopback_origin(request.headers.get("origin"))
        referer = _loopback_origin(request.headers.get("referer"))
        local_origin = origin or referer
        if local_origin:
            return f"{local_origin}/admin"

    return f"{_frontend_url()}/admin".rstrip("/")


def _build_admin_magic_url(token: str, request: Request | None = None) -> str:
    """Build the frontend URL that consumes an admin magic link token."""
    return f"{_admin_frontend_url(request)}?token={token}"


# ── JWT helpers ──────────────────────────────────────────────────────────────


def _create_admin_token(email: str, require_2fa: bool = False) -> str:
    """Create a JWT for admin session (30 days)."""
    payload = {
        "sub": email,
        "type": "admin_session",
        "require_2fa": require_2fa,
        "exp": datetime.now(UTC) + timedelta(days=30),
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def _create_device_token(email: str) -> str:
    """Create a long-lived opaque device token and store it in DB."""
    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    await db.admin_device_tokens.insert_one({
        "token_hash": token_hash,
        "email": email,
        "created_at": datetime.now(UTC),
        "expires_at": datetime.now(UTC) + timedelta(days=DEVICE_TOKEN_EXPIRY_DAYS),
        "last_used": datetime.now(UTC),
    })
    return token


async def _verify_device_token(token: str) -> str | None:
    """Verify a device token and return the associated email, or None."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    doc = await db.admin_device_tokens.find_one({
        "token_hash": token_hash,
        "expires_at": {"$gt": datetime.now(UTC)},
    })
    if not doc:
        return None
    email = doc["email"]
    if email not in ADMIN_EMAILS:
        return None
    # Refresh last_used timestamp
    await db.admin_device_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"last_used": datetime.now(UTC)}},
    )
    return email


def _create_magic_token(email: str) -> str:
    """Create a short-lived magic link token."""
    payload = {
        "sub": email,
        "type": "magic_link",
        "exp": datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
        "iat": datetime.now(UTC),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── Cookie helpers ──────────────────────────────────────────────────────────

ADMIN_COOKIE_NAME = "admin_access_token"
ADMIN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days

# Device token: long-lived opaque token stored in localStorage + DB.
# Survives private browsing / cookie purge → allows session refresh
# without re-authenticating via magic link.
DEVICE_TOKEN_EXPIRY_DAYS = 90


def _set_admin_cookie(response: Response, token: str) -> None:
    is_secure = os.environ.get("FRONTEND_URL", "").startswith("https")
    response.set_cookie(
        key=ADMIN_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=ADMIN_COOKIE_MAX_AGE,
        path="/api/admin-bo",
    )


def _clear_admin_cookie(response: Response) -> None:
    is_secure = os.environ.get("FRONTEND_URL", "").startswith("https")
    response.set_cookie(
        key=ADMIN_COOKIE_NAME,
        value="",
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=0,
        path="/api/admin-bo",
    )


# ── Auth dependency (exported) ───────────────────────────────────────────────


async def get_current_admin(request: Request) -> dict:
    """FastAPI dependency - validates admin JWT from cookie or Authorization header."""
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifie")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin_session":
            raise HTTPException(status_code=401, detail="Token invalide")
        if payload.get("require_2fa"):
            raise HTTPException(status_code=403, detail="Validation 2FA requise")
        email = payload.get("sub", "").lower()
        if email not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Acces refuse")
        admin = await db.admin_accounts.find_one({"email": email}, {"_id": 0})
        if not admin:
            admin = {"email": email, "totp_enabled": False, "created_at": datetime.now(UTC).isoformat()}
        return admin
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expiree") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token invalide") from exc


# ── TOTP helpers ─────────────────────────────────────────────────────────────


def _generate_totp_secret() -> str:
    """Generate a base32-encoded TOTP secret."""
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8")


def _verify_totp(secret: str, code: str, window: int = 1) -> bool:
    """Verify a TOTP code with a time window tolerance."""
    key = base64.b32decode(secret)
    current_time = int(time.time()) // 30

    for offset in range(-window, window + 1):
        counter = struct.pack(">Q", current_time + offset)
        h = hmac.HMAC(key, counter, hashlib.sha1).digest()
        o = h[-1] & 0x0F
        truncated = struct.unpack(">I", h[o : o + 4])[0] & 0x7FFFFFFF
        expected = str(truncated % 1_000_000).zfill(6)
        if hmac.compare_digest(code, expected):
            return True
    return False


# ── Pydantic models ──────────────────────────────────────────────────────────


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerify(BaseModel):
    token: str
    remember_device: bool = False


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    remember_device: bool = False


class DeviceRefreshRequest(BaseModel):
    device_token: str


# ── Email helpers ────────────────────────────────────────────────────────────


async def _send_magic_link_email(email: str, magic_url: str, lang: str = "fr") -> bool:
    """Send admin magic link via SMTP."""
    tpl = admin_magic_link_tpl(magic_url, MAGIC_LINK_EXPIRY_MINUTES, lang=lang)
    return await send_email(
        email,
        tpl.subject,
        tpl.text,
        tpl.html_body,
        raise_on_error=True,
    )


async def _send_invitation_email(
    email: str,
    invite_url: str,
    message: str | None = None,
    league_code: str | None = None,
    lang: str = "fr",
) -> bool:
    """Send invitation email via SMTP."""
    tpl = invitation_tpl(invite_url, message, league_code, lang=lang)
    return await send_email(
        email,
        tpl.subject,
        tpl.text,
        tpl.html_body,
        raise_on_error=True,
    )


# ═══════════════════════════════════════ AUTH ENDPOINTS ═══════════════════════


@router.post("/auth/magic-link")
async def send_magic_link(data: MagicLinkRequest, request: Request) -> dict:
    """Send a magic link to the admin email."""
    email = data.email.strip().lower()
    if email not in ADMIN_EMAILS:
        return {"message": "Si cette adresse est autorisée, un lien de connexion a été envoyé."}

    token = _create_magic_token(email)

    await db.admin_magic_links.insert_one({
        "token_id": jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])["jti"],
        "email": email,
        "used": False,
        "created_at": datetime.now(UTC),
        "expires_at": datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
    })

    magic_url = _build_admin_magic_url(token, request)

    # Admin back-office is French-only — always send admin emails in French
    if not await _send_magic_link_email(email, magic_url, lang="fr"):
        logger.info(f"[Admin Auth] Magic link for {email}: {magic_url}")

    return {"message": "Si cette adresse est autorisée, un lien de connexion a été envoyé."}


@router.post("/auth/verify")
async def verify_magic_link(data: MagicLinkVerify, response: Response) -> dict:
    """Verify magic link token and create admin session."""
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "magic_link":
            raise HTTPException(status_code=400, detail="Token invalide")

        email = payload["sub"].lower()
        jti = payload["jti"]

        link_doc = await db.admin_magic_links.find_one({"token_id": jti, "used": False})
        if not link_doc:
            raise HTTPException(status_code=400, detail="Lien deja utilise ou expire")

        await db.admin_magic_links.update_one({"token_id": jti}, {"$set": {"used": True}})

        admin = await db.admin_accounts.find_one({"email": email}, {"_id": 0})
        totp_enabled = admin.get("totp_enabled", False) if admin else False

        if totp_enabled:
            partial_token = _create_admin_token(email, require_2fa=True)
            return {
                "requires_2fa": True,
                "partial_token": partial_token,
                "remember_device": data.remember_device,
            }

        session_token = _create_admin_token(email, require_2fa=False)

        await db.admin_accounts.update_one(
            {"email": email},
            {"$set": {"email": email, "last_login": datetime.now(UTC).isoformat()},
             "$setOnInsert": {"totp_enabled": False, "created_at": datetime.now(UTC).isoformat()}},
            upsert=True,
        )

        _set_admin_cookie(response, session_token)

        result: dict = {"requires_2fa": False, "email": email}
        if data.remember_device:
            result["device_token"] = await _create_device_token(email)
        return result

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=400, detail="Lien expire") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=400, detail="Token invalide") from exc


@router.post("/auth/2fa/setup")
async def setup_2fa(admin: dict = Depends(get_current_admin)) -> dict:
    """Generate TOTP secret for 2FA setup."""
    secret = _generate_totp_secret()

    await db.admin_accounts.update_one(
        {"email": admin["email"]},
        {"$set": {"totp_pending_secret": secret}},
        upsert=True,
    )

    otpauth_url = f"otpauth://totp/Pronokif:Admin ({admin['email']})?secret={secret}&issuer=Pronokif"
    return {"secret": secret, "otpauth_url": otpauth_url}


@router.post("/auth/2fa/verify")
async def verify_2fa_setup(data: TotpVerifyRequest, admin: dict = Depends(get_current_admin)) -> dict:
    """Verify TOTP code to enable 2FA."""
    account = await db.admin_accounts.find_one({"email": admin["email"]})
    if not account or not account.get("totp_pending_secret"):
        raise HTTPException(status_code=400, detail="Aucune configuration 2FA en attente")

    if not _verify_totp(account["totp_pending_secret"], data.code):
        raise HTTPException(status_code=400, detail="Code invalide")

    await db.admin_accounts.update_one(
        {"email": admin["email"]},
        {"$set": {"totp_enabled": True, "totp_secret": account["totp_pending_secret"]},
         "$unset": {"totp_pending_secret": ""}},
    )

    return {"message": "2FA activé avec succès"}


@router.post("/auth/2fa/validate")
async def validate_2fa_login(data: TotpVerifyRequest, request: Request, response: Response) -> dict:
    """Validate TOTP code during login (after magic link verify returned requires_2fa)."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token partiel requis")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin_session" or not payload.get("require_2fa"):
            raise HTTPException(status_code=400, detail="Token invalide pour cette étape")

        email = payload["sub"].lower()
        account = await db.admin_accounts.find_one({"email": email})
        if not account or not account.get("totp_secret"):
            raise HTTPException(status_code=400, detail="2FA non configure")

        if not _verify_totp(account["totp_secret"], data.code):
            raise HTTPException(status_code=400, detail="Code invalide")

        session_token = _create_admin_token(email, require_2fa=False)
        await db.admin_accounts.update_one(
            {"email": email}, {"$set": {"last_login": datetime.now(UTC).isoformat()}}
        )

        _set_admin_cookie(response, session_token)

        result: dict = {"email": email}
        if data.remember_device:
            result["device_token"] = await _create_device_token(email)
        return result

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expiree") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token invalide") from exc


@router.post("/auth/refresh")
async def refresh_session(data: DeviceRefreshRequest, response: Response) -> dict:
    """Re-create an admin session from a device token (stored in localStorage).

    This allows admins to stay logged in even if the httpOnly cookie is
    cleared (private browsing, cache purge, etc.) without requesting a
    new magic link.
    """
    email = await _verify_device_token(data.device_token)
    if not email:
        raise HTTPException(status_code=401, detail="Token appareil invalide ou expiré")

    # If admin has 2FA enabled, they must still pass it
    admin = await db.admin_accounts.find_one({"email": email}, {"_id": 0})
    if admin and admin.get("totp_enabled"):
        partial_token = _create_admin_token(email, require_2fa=True)
        return {"requires_2fa": True, "partial_token": partial_token}

    session_token = _create_admin_token(email, require_2fa=False)
    await db.admin_accounts.update_one(
        {"email": email}, {"$set": {"last_login": datetime.now(UTC).isoformat()}}
    )

    _set_admin_cookie(response, session_token)
    return {"email": email}


@router.post("/auth/logout")
async def admin_logout(request: Request, response: Response) -> dict:
    """Clear admin session cookie and optionally revoke device token."""
    _clear_admin_cookie(response)
    # Revoke the device token if the frontend sends it
    import contextlib

    body: dict = {}
    with contextlib.suppress(Exception):
        body = await request.json()
    device_token = body.get("device_token")
    if device_token:
        token_hash = hashlib.sha256(device_token.encode()).hexdigest()
        await db.admin_device_tokens.delete_one({"token_hash": token_hash})
    return {"message": "Deconnecte"}


@router.get("/auth/me")
async def admin_me(admin: dict = Depends(get_current_admin)) -> dict:
    """Return current admin info."""
    return {
        "email": admin["email"],
        "totp_enabled": admin.get("totp_enabled", False),
        "last_login": admin.get("last_login"),
    }
