"""
PRONOKIF - Authentication Routes
/auth/* endpoints for registration, login, and user management
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from config import db
from features import get_default_user_stats
from models.schemas import TokenResponse, UserCreate, UserLogin, UserResponse, UserSetUsername
from services.auth import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Register a new user"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

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
    }
    await db.users.insert_one(user)

    # Create default stats
    await db.user_stats.insert_one({"user_id": user_id, **get_default_user_stats()})

    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
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
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    """Login with email and password"""
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

    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
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
        ),
    )


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
    )


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
    )
