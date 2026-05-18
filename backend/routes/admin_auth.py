"""
PRONOKIF - Admin Back-Office: Authentication & 2FA.

Magic link auth + optional TOTP 2FA for whitelisted admin emails.
Exports `get_current_admin` dependency used by admin_data and admin_content.

Endpoints:
  POST /admin-bo/auth/magic-link     - send magic link email
  POST /admin-bo/auth/verify         - verify magic link token
  POST /admin-bo/auth/2fa/setup      - generate TOTP secret
  POST /admin-bo/auth/2fa/verify     - verify TOTP code and enable
  POST /admin-bo/auth/2fa/validate   - validate TOTP on login
  GET  /admin-bo/auth/me             - current admin session
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

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from config import JWT_ALGORITHM, JWT_SECRET, db, logger

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-auth"])

# ── Admin whitelist ──────────────────────────────────────────────────────────
ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.environ.get(
        "ADMIN_BACKOFFICE_EMAILS",
        "baptiste.catalan123@gmail.com,fred@stormeo.io",
    ).split(",")
]

MAGIC_LINK_EXPIRY_MINUTES = 15

# ── JWT helpers ──────────────────────────────────────────────────────────────


def _create_admin_token(email: str, require_2fa: bool = False) -> str:
    """Create a JWT for admin session."""
    payload = {
        "sub": email,
        "type": "admin_session",
        "require_2fa": require_2fa,
        "exp": datetime.now(UTC) + timedelta(hours=24 * 7),
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


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
ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days, matches JWT expiry


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


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


# ── Email helpers ────────────────────────────────────────────────────────────


async def _send_magic_link_email(email: str, magic_url: str) -> None:
    """Send magic link via SMTP."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("SMTP_FROM", "noreply@pronokif.com")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Pronokif Admin - Connexion"
    msg["From"] = from_email
    msg["To"] = email

    html = f"""
    <html>
    <body style="font-family: sans-serif; background: #0a0f1a; color: #fff; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1a1f2e; border-radius: 16px; padding: 32px; border: 1px solid #333;">
        <h1 style="color: #f97316; font-size: 24px; margin-bottom: 16px;">Pronokif Admin</h1>
        <p style="color: #ccc; margin-bottom: 24px;">Cliquez sur le bouton ci-dessous pour vous connecter au panneau d'administration.</p>
        <a href="{magic_url}" style="display: inline-block; background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Se connecter
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Ce lien expire dans {MAGIC_LINK_EXPIRY_MINUTES} minutes. Si vous n'avez pas demande ce lien, ignorez ce message.</p>
      </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


async def _send_invitation_email(email: str, invite_url: str, message: str | None = None) -> None:
    """Send invitation email via SMTP."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("SMTP_FROM", "noreply@pronokif.com")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Invitation a rejoindre Pronokif"
    msg["From"] = from_email
    msg["To"] = email

    personal_msg = f'<p style="color: #ccc; margin-bottom: 16px; font-style: italic;">"{message}"</p>' if message else ""

    html = f"""
    <html>
    <body style="font-family: sans-serif; background: #0a0f1a; color: #fff; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1a1f2e; border-radius: 16px; padding: 32px; border: 1px solid #333;">
        <h1 style="color: #f97316; font-size: 24px; margin-bottom: 16px;">Bienvenue sur Pronokif !</h1>
        <p style="color: #ccc; margin-bottom: 16px;">Vous etes invite(e) a rejoindre Pronokif, le jeu de pronostics F1 entre amis.</p>
        {personal_msg}
        <a href="{invite_url}" style="display: inline-block; background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Creer mon compte
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Cette invitation expire dans 7 jours.</p>
      </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


# ═══════════════════════════════════════ AUTH ENDPOINTS ═══════════════════════


@router.post("/auth/magic-link")
async def send_magic_link(data: MagicLinkRequest) -> dict:
    """Send a magic link to the admin email."""
    email = data.email.lower()
    if email not in ADMIN_EMAILS:
        return {"message": "Si cette adresse est autorisee, un lien de connexion a ete envoye."}

    token = _create_magic_token(email)

    await db.admin_magic_links.insert_one({
        "token_id": jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])["jti"],
        "email": email,
        "used": False,
        "created_at": datetime.now(UTC),
        "expires_at": datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
    })

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    magic_url = f"{frontend_url}/admin/auth?token={token}"

    smtp_host = os.environ.get("SMTP_HOST")
    if smtp_host:
        await _send_magic_link_email(email, magic_url)
    else:
        logger.info(f"[Admin Auth] Magic link for {email}: {magic_url}")

    return {"message": "Si cette adresse est autorisee, un lien de connexion a ete envoye."}


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
            return {"requires_2fa": True, "partial_token": partial_token}

        session_token = _create_admin_token(email, require_2fa=False)

        await db.admin_accounts.update_one(
            {"email": email},
            {"$set": {"email": email, "last_login": datetime.now(UTC).isoformat()},
             "$setOnInsert": {"totp_enabled": False, "created_at": datetime.now(UTC).isoformat()}},
            upsert=True,
        )

        _set_admin_cookie(response, session_token)
        return {"requires_2fa": False, "email": email}

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

    return {"message": "2FA active avec succes"}


@router.post("/auth/2fa/validate")
async def validate_2fa_login(data: TotpVerifyRequest, request: Request, response: Response) -> dict:
    """Validate TOTP code during login (after magic link verify returned requires_2fa)."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token partiel requis")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin_session" or not payload.get("require_2fa"):
            raise HTTPException(status_code=400, detail="Token invalide pour cette etape")

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
        return {"email": email}

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expiree") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token invalide") from exc


@router.post("/auth/logout")
async def admin_logout(response: Response) -> dict:
    """Clear admin session cookie."""
    _clear_admin_cookie(response)
    return {"message": "Deconnecte"}


@router.get("/auth/me")
async def admin_me(admin: dict = Depends(get_current_admin)) -> dict:
    """Return current admin info."""
    return {
        "email": admin["email"],
        "totp_enabled": admin.get("totp_enabled", False),
        "last_login": admin.get("last_login"),
    }
