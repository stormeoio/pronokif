"""
PRONOKIF - Authentication Routes
/auth/* endpoints for registration, login, token refresh, logout,
and email verification.

Security fixes implemented:
  P0-2: httpOnly cookies replace localStorage tokens
  P1-1: access token 1h + refresh token 7d
  P1-2: password complexity validation
  P1-3: email verification on registration
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from config import (
    COOKIE_DOMAIN,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    db,
    logger,
)

# Rate limiter (shared instance from middleware, None if slowapi not installed)
from middleware.security import limiter

# 5 req/min on login+register to block brute force (no-op if slowapi missing)
_rate_5_per_min = limiter.limit("5/minute") if limiter else lambda f: f
from features import get_default_user_stats
from models.schemas import TokenResponse, UserCreate, UserLogin, UserResponse, UserSetUsername
from services.auth import (
    create_access_token,
    create_refresh_token,
    generate_verification_token,
    get_current_user,
    get_user_from_refresh_token,
    hash_password,
    send_verification_email,
    validate_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Cookie helpers ───────────────────────────────────────────────────────────


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set httpOnly cookies for both access and refresh tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        domain=COOKIE_DOMAIN,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",  # only sent to auth endpoints
        domain=COOKIE_DOMAIN,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies."""
    response.delete_cookie("access_token", path="/", domain=COOKIE_DOMAIN)
    response.delete_cookie("refresh_token", path="/api/auth", domain=COOKIE_DOMAIN)


# ── Register ─────────────────────────────────────────────────────────────────


@router.post("/register", response_model=TokenResponse)
@_rate_5_per_min
async def register(request: Request, data: UserCreate, response: Response):
    """Register a new user with password validation and email verification."""
    # P1-2: validate password complexity
    password_error = validate_password(data.password)
    if password_error:
        raise HTTPException(status_code=422, detail=password_error)

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # P1-3: generate email verification token
    verification_token = generate_verification_token()

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "username": None,
        "current_league_id": None,
        "xp": 0,
        "level": 1,
        "avatar_id": None,
        "custom_avatar_url": None,
        "created_at": datetime.now(UTC).isoformat(),
        "email_verified": False,
        "email_verification_token": verification_token,
    }
    await db.users.insert_one(user)

    # Create default stats
    await db.user_stats.insert_one({"user_id": user_id, **get_default_user_stats()})

    # Send verification email (logs URL in dev, sends real email in prod)
    await send_verification_email(data.email, verification_token)

    # P0-2 + P1-1: set httpOnly cookies
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            username=None,
            created_at=user["created_at"],
            current_league_id=None,
            xp=0,
            level=1,
            avatar_id=None,
            custom_avatar_url=None,
            email_verified=False,
        ),
    )


# ── Login ────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse)
@_rate_5_per_min
async def login(data: UserLogin, request: Request, response: Response):
    """Login with email and password. Sets httpOnly cookies."""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Extract IP and user agent from request
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "unknown")

    # Record login session
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "login_at": datetime.now(UTC).isoformat(),
        "logout_at": None,
        "user_agent": user_agent,
        "ip_address": client_ip,
    }
    await db.user_sessions.insert_one(session)

    # Update last login
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": datetime.now(UTC).isoformat()}})

    # P0-2 + P1-1: set httpOnly cookies
    access_token = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user.get("username"),
            created_at=user["created_at"],
            current_league_id=user.get("current_league_id"),
            xp=user.get("xp", 0),
            level=user.get("level", 1),
            avatar_id=user.get("avatar_id"),
            custom_avatar_url=user.get("custom_avatar_url"),
            email_verified=user.get("email_verified", False),
        ),
    )


# ── Refresh ──────────────────────────────────────────────────────────────────


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: Request, response: Response):
    """Use refresh token cookie to get a new access token."""
    user = await get_user_from_refresh_token(request)

    access_token = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user.get("username"),
            created_at=user["created_at"],
            current_league_id=user.get("current_league_id"),
            xp=user.get("xp", 0),
            level=user.get("level", 1),
            avatar_id=user.get("avatar_id"),
            custom_avatar_url=user.get("custom_avatar_url"),
            email_verified=user.get("email_verified", False),
        ),
    )


# ── Logout ───────────────────────────────────────────────────────────────────


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies."""
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


# ── Me ───────────────────────────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user.get("username"),
        created_at=user["created_at"],
        current_league_id=user.get("current_league_id"),
        xp=user.get("xp", 0),
        level=user.get("level", 1),
        avatar_id=user.get("avatar_id"),
        custom_avatar_url=user.get("custom_avatar_url"),
        email_verified=user.get("email_verified", False),
    )


# ── Set username ─────────────────────────────────────────────────────────────


@router.post("/username", response_model=UserResponse)
async def set_username(data: UserSetUsername, user=Depends(get_current_user)):
    """Set or update username"""
    existing = await db.users.find_one({"username": data.username, "id": {"$ne": user["id"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    await db.users.update_one({"id": user["id"]}, {"$set": {"username": data.username}})
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=data.username,
        created_at=user["created_at"],
        current_league_id=user.get("current_league_id"),
        xp=user.get("xp", 0),
        level=user.get("level", 1),
        email_verified=user.get("email_verified", False),
    )


# ── Email verification (P1-3) ───────────────────────────────────────────────


@router.get("/verify-email")
async def verify_email(token: str):
    """Verify email with the token sent during registration."""
    user = await db.users.find_one(
        {"email_verification_token": token, "email_verified": False},
        {"_id": 0},
    )
    if not user:
        raise HTTPException(status_code=400, detail="Token de verification invalide ou deja utilise")

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"email_verified": True},
            "$unset": {"email_verification_token": ""},
        },
    )
    return {"message": "Email verifie avec succes"}


@router.post("/resend-verification")
async def resend_verification(user=Depends(get_current_user)):
    """Resend verification email for the current user."""
    if user.get("email_verified"):
        return {"message": "Email deja verifie"}

    new_token = generate_verification_token()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verification_token": new_token}},
    )
    await send_verification_email(user["email"], new_token)
    return {"message": "Email de verification renvoye"}
