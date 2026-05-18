"""
PRONOKIF - Authentication Utilities
Password hashing/validation, JWT token management (access + refresh),
cookie-based auth, and email verification.
"""

import re
import random
import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import HTTPException, Request

from config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    JWT_ALGORITHM,
    JWT_SECRET,
    db,
    logger,
)

# ── Password validation (P1-2 fix) ──────────────────────────────────────────

PASSWORD_MIN_LENGTH = 8


def validate_password(password: str) -> str | None:
    """Validate password complexity. Returns error message or None if valid."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Le mot de passe doit contenir au moins {PASSWORD_MIN_LENGTH} caracteres"
    if not re.search(r"[A-Z]", password):
        return "Le mot de passe doit contenir au moins une lettre majuscule"
    if not re.search(r"[a-z]", password):
        return "Le mot de passe doit contenir au moins une lettre minuscule"
    if not re.search(r"\d", password):
        return "Le mot de passe doit contenir au moins un chiffre"
    return None


# ── Password hashing ────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT token creation (P1-1 fix: access 1h + refresh 7d) ──────────────────


def create_access_token(user_id: str) -> str:
    """Create a short-lived access JWT (1 hour)."""
    expiration = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expiration,
        "iat": datetime.now(UTC),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh JWT (7 days) with unique jti."""
    expiration = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expiration,
        "iat": datetime.now(UTC),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Legacy compat — used in one or two places that still call create_token()
create_token = create_access_token


# ── Token extraction from request (P0-2 fix: cookie-first) ──────────────────


def _extract_token(request: Request) -> str | None:
    """Extract JWT from httpOnly cookie first, fallback to Authorization header."""
    # 1. httpOnly cookie (new secure path)
    token = request.cookies.get("access_token")
    if token:
        return token
    # 2. Authorization: Bearer <token> (backward compat during migration)
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth[7:]
    return None


async def get_current_user(request: Request):
    """Dependency to get the current authenticated user from cookie or header."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Reject refresh tokens used as access tokens
        if payload.get("type") == "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_user_from_refresh_token(request: Request) -> dict:
    """Extract and validate the refresh token from httpOnly cookie."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Refresh token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc


# ── Email verification (P1-3 fix) ───────────────────────────────────────────


def generate_verification_token() -> str:
    """Generate a URL-safe verification token."""
    return secrets.token_urlsafe(32)


async def send_verification_email(email: str, token: str) -> None:
    """
    Send email verification link. Currently logs to console.
    Replace with actual email service (SendGrid, SES, etc.) for production.
    """
    # TODO: wire real email provider
    verify_url = f"https://pronokif.stormeo.io/verify-email?token={token}"
    logger.info(
        f"[Email Verification] To: {email} | "
        f"Token: {token} | "
        f"URL: {verify_url}"
    )


# ── Utility helpers ──────────────────────────────────────────────────────────


def generate_league_code() -> str:
    """Generate a random 6-character league code"""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def send_user_notification(user_id: str, message: str, notif_type: str = "info"):
    """Internal helper to send notification to a specific user"""
    notification = {
        "id": str(uuid.uuid4()),
        "title": notif_type.replace("_", " ").title(),
        "message": message,
        "type": notif_type,
        "created_at": datetime.now(UTC).isoformat(),
        "user_id": user_id,
        "is_personal": True,
    }
    await db.notifications.insert_one(notification)
    await db.users.update_one({"id": user_id}, {"$addToSet": {"unread_notifications": notification["id"]}})


async def check_is_admin(user: dict) -> bool:
    """Check if user is an admin (league creator)"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    return len(user_leagues) > 0
