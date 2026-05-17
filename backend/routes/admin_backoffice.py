"""
PRONOKIF - Admin Back-Office Routes.

Authentication via magic link + optional TOTP 2FA.
Restricted to whitelisted admin emails.

Endpoints:
  POST /admin-bo/auth/magic-link     — send magic link email
  POST /admin-bo/auth/verify         — verify magic link token
  POST /admin-bo/auth/2fa/setup      — generate TOTP secret
  POST /admin-bo/auth/2fa/verify     — verify TOTP code and enable
  POST /admin-bo/auth/2fa/validate   — validate TOTP on login
  GET  /admin-bo/auth/me             — current admin session

  GET  /admin-bo/users               — list all users
  GET  /admin-bo/users/:id           — user detail
  PUT  /admin-bo/users/:id           — update user
  DELETE /admin-bo/users/:id         — delete user

  GET  /admin-bo/championships       — list championships (races)
  POST /admin-bo/championships       — create championship
  PUT  /admin-bo/championships/:id   — update championship
  DELETE /admin-bo/championships/:id — delete championship

  GET  /admin-bo/predictions         — list predictions (filterable)
  GET  /admin-bo/feedbacks           — list feedbacks
  PUT  /admin-bo/feedbacks/:id/read  — mark feedback read
  DELETE /admin-bo/feedbacks/:id     — delete feedback

  POST /admin-bo/invitations         — send email invitation
  GET  /admin-bo/invitations         — list sent invitations

  POST /admin-bo/media/upload        — upload media
  GET  /admin-bo/media               — list media
  DELETE /admin-bo/media/:id         — delete media

  GET  /admin-bo/settings            — get app settings
  PUT  /admin-bo/settings            — update app settings
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, EmailStr, Field

from config import JWT_ALGORITHM, JWT_SECRET, db, logger

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice"])

# ── Admin whitelist ──────────────────────────────────────────────────────────
ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.environ.get(
        "ADMIN_BACKOFFICE_EMAILS",
        "baptiste.catalan123@gmail.com,fred@stormeo.io",
    ).split(",")
]

# Magic link token expiration (15 minutes)
MAGIC_LINK_EXPIRY_MINUTES = 15

# ── Helpers ──────────────────────────────────────────────────────────────────


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


from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_admin_security = HTTPBearer()


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(_admin_security)) -> dict:
    """FastAPI dependency — validates admin JWT and returns admin info."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin_session":
            raise HTTPException(status_code=401, detail="Token invalide")
        if payload.get("require_2fa"):
            raise HTTPException(status_code=403, detail="Validation 2FA requise")
        email = payload.get("sub", "").lower()
        if email not in ADMIN_EMAILS:
            raise HTTPException(status_code=403, detail="Accès refusé")
        admin = await db.admin_accounts.find_one({"email": email}, {"_id": 0})
        if not admin:
            admin = {"email": email, "totp_enabled": False, "created_at": datetime.now(UTC).isoformat()}
        return admin
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expirée") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token invalide") from exc


# ── TOTP helpers ─────────────────────────────────────────────────────────────

def _generate_totp_secret() -> str:
    """Generate a base32-encoded TOTP secret."""
    import base64
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8")


def _verify_totp(secret: str, code: str, window: int = 1) -> bool:
    """Verify a TOTP code with a time window tolerance."""
    import base64
    import struct

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


# ═══════════════════════════════════════ AUTH ENDPOINTS ═══════════════════════


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerify(BaseModel):
    token: str


class TotpSetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class TotpVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


@router.post("/auth/magic-link")
async def send_magic_link(data: MagicLinkRequest) -> dict:
    """Send a magic link to the admin email."""
    email = data.email.lower()
    if email not in ADMIN_EMAILS:
        # Don't reveal whether email is valid
        return {"message": "Si cette adresse est autorisée, un lien de connexion a été envoyé."}

    token = _create_magic_token(email)

    # Store the magic link token for single-use verification
    await db.admin_magic_links.insert_one({
        "token_id": jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])["jti"],
        "email": email,
        "used": False,
        "created_at": datetime.now(UTC),
        "expires_at": datetime.now(UTC) + timedelta(minutes=MAGIC_LINK_EXPIRY_MINUTES),
    })

    # Build magic link URL
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    magic_url = f"{frontend_url}/admin/auth?token={token}"

    # Send email (use simple SMTP or log for dev)
    smtp_host = os.environ.get("SMTP_HOST")
    if smtp_host:
        await _send_magic_link_email(email, magic_url)
    else:
        logger.info(f"[Admin Auth] Magic link for {email}: {magic_url}")

    return {"message": "Si cette adresse est autorisée, un lien de connexion a été envoyé."}


@router.post("/auth/verify")
async def verify_magic_link(data: MagicLinkVerify) -> dict:
    """Verify magic link token and create admin session."""
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "magic_link":
            raise HTTPException(status_code=400, detail="Token invalide")

        email = payload["sub"].lower()
        jti = payload["jti"]

        # Check single-use
        link_doc = await db.admin_magic_links.find_one({"token_id": jti, "used": False})
        if not link_doc:
            raise HTTPException(status_code=400, detail="Lien déjà utilisé ou expiré")

        # Mark as used
        await db.admin_magic_links.update_one({"token_id": jti}, {"$set": {"used": True}})

        # Check if 2FA is enabled
        admin = await db.admin_accounts.find_one({"email": email}, {"_id": 0})
        totp_enabled = admin.get("totp_enabled", False) if admin else False

        if totp_enabled:
            # Return partial token requiring 2FA
            partial_token = _create_admin_token(email, require_2fa=True)
            return {"requires_2fa": True, "partial_token": partial_token}

        # Create full session
        session_token = _create_admin_token(email, require_2fa=False)

        # Ensure admin account exists
        await db.admin_accounts.update_one(
            {"email": email},
            {"$set": {"email": email, "last_login": datetime.now(UTC).isoformat()},
             "$setOnInsert": {"totp_enabled": False, "created_at": datetime.now(UTC).isoformat()}},
            upsert=True,
        )

        return {"access_token": session_token, "requires_2fa": False, "email": email}

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=400, detail="Lien expiré") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=400, detail="Token invalide") from exc


@router.post("/auth/2fa/setup")
async def setup_2fa(admin: dict = Depends(get_current_admin)) -> dict:
    """Generate TOTP secret for 2FA setup."""
    secret = _generate_totp_secret()

    # Store pending secret (not yet verified)
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

    # Enable 2FA
    await db.admin_accounts.update_one(
        {"email": admin["email"]},
        {"$set": {"totp_enabled": True, "totp_secret": account["totp_pending_secret"]},
         "$unset": {"totp_pending_secret": ""}},
    )

    return {"message": "2FA activé avec succès"}


@router.post("/auth/2fa/validate")
async def validate_2fa_login(data: TotpVerifyRequest, credentials: HTTPAuthorizationCredentials = Depends(_admin_security)) -> dict:
    """Validate TOTP code during login (after magic link verify returned requires_2fa)."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin_session" or not payload.get("require_2fa"):
            raise HTTPException(status_code=400, detail="Token invalide pour cette étape")

        email = payload["sub"].lower()
        account = await db.admin_accounts.find_one({"email": email})
        if not account or not account.get("totp_secret"):
            raise HTTPException(status_code=400, detail="2FA non configuré")

        if not _verify_totp(account["totp_secret"], data.code):
            raise HTTPException(status_code=400, detail="Code invalide")

        # Create full session token
        session_token = _create_admin_token(email, require_2fa=False)
        await db.admin_accounts.update_one(
            {"email": email}, {"$set": {"last_login": datetime.now(UTC).isoformat()}}
        )

        return {"access_token": session_token, "email": email}

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Session expirée") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token invalide") from exc


@router.get("/auth/me")
async def admin_me(admin: dict = Depends(get_current_admin)) -> dict:
    """Return current admin info."""
    return {
        "email": admin["email"],
        "totp_enabled": admin.get("totp_enabled", False),
        "last_login": admin.get("last_login"),
    }


# ═══════════════════════════════════════ USERS CRUD ═══════════════════════════


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    is_banned: Optional[bool] = None


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all users with pagination and search."""
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Get user detail with stats."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Get prediction count
    pred_count = await db.predictions.count_documents({"user_id": user_id})
    # Get league memberships
    leagues = await db.leagues.find(
        {"$or": [{"created_by": user_id}, {"members": user_id}]}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(20)

    return {**user, "predictions_count": pred_count, "leagues": leagues}


@router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, admin: dict = Depends(get_current_admin)) -> dict:
    """Update a user."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur mis à jour"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a user and their data."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # Delete user + related data
    await db.users.delete_one({"id": user_id})
    await db.predictions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "Utilisateur et données supprimés"}


# ═══════════════════════════════════════ CHAMPIONSHIPS CRUD ═══════════════════


class ChampionshipCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    season: int = Field(..., ge=2020, le=2030)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool = True


class ChampionshipUpdate(BaseModel):
    name: Optional[str] = None
    season: Optional[int] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/championships")
async def list_championships(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all championships."""
    return await db.championships.find({}, {"_id": 0}).sort("season", -1).to_list(100)


@router.post("/championships")
async def create_championship(data: ChampionshipCreate, admin: dict = Depends(get_current_admin)) -> dict:
    """Create a new championship."""
    championship = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(UTC).isoformat(),
        "created_by": admin["email"],
    }
    await db.championships.insert_one(championship)
    return {"message": "Championnat créé", "id": championship["id"]}


@router.put("/championships/{champ_id}")
async def update_championship(champ_id: str, data: ChampionshipUpdate, admin: dict = Depends(get_current_admin)) -> dict:
    """Update a championship."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.championships.update_one({"id": champ_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouvé")
    return {"message": "Championnat mis à jour"}


@router.delete("/championships/{champ_id}")
async def delete_championship(champ_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a championship."""
    result = await db.championships.delete_one({"id": champ_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouvé")
    return {"message": "Championnat supprimé"}


# ═══════════════════════════════════════ RACES (events) CRUD ══════════════════


class RaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: str  # ISO date string
    is_sprint: bool = False
    round_number: Optional[int] = None
    season: int = Field(..., ge=2020, le=2030)
    thumbnail_url: Optional[str] = None


class RaceUpdate(BaseModel):
    name: Optional[str] = None
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: Optional[str] = None
    is_sprint: Optional[bool] = None
    round_number: Optional[int] = None
    thumbnail_url: Optional[str] = None
    is_past: Optional[bool] = None


@router.get("/races")
async def list_races(
    season: Optional[int] = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all races, optionally filtered by season."""
    query = {}
    if season:
        query["season"] = season
    return await db.races.find(query, {"_id": 0}).sort("date", 1).to_list(100)


@router.post("/races")
async def create_race(data: RaceCreate, admin: dict = Depends(get_current_admin)) -> dict:
    """Create a new race event."""
    race = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "is_past": False,
        "has_results": False,
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.races.insert_one(race)
    return {"message": "Course créée", "id": race["id"]}


@router.put("/races/{race_id}")
async def update_race(race_id: str, data: RaceUpdate, admin: dict = Depends(get_current_admin)) -> dict:
    """Update a race event."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.races.update_one({"id": race_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    return {"message": "Course mise à jour"}


@router.delete("/races/{race_id}")
async def delete_race(race_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a race event."""
    result = await db.races.delete_one({"id": race_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    return {"message": "Course supprimée"}


# ═══════════════════════════════════════ PREDICTIONS ══════════════════════════


@router.get("/predictions")
async def list_predictions(
    user_id: Optional[str] = None,
    race_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List predictions with filters."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if race_id:
        query["race_id"] = race_id

    total = await db.predictions.count_documents(query)
    predictions = await db.predictions.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    return {"predictions": predictions, "total": total}


# ═══════════════════════════════════════ FEEDBACKS ════════════════════════════


@router.get("/feedbacks")
async def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all feedbacks."""
    query = {}
    if unread_only:
        query["read"] = False
    total = await db.feedback.count_documents(query)
    feedbacks = await db.feedback.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    return {"feedbacks": feedbacks, "total": total}


@router.put("/feedbacks/{feedback_id}/read")
async def mark_feedback_read(feedback_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Mark feedback as read."""
    result = await db.feedback.update_one({"id": feedback_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouvé")
    return {"message": "Marqué comme lu"}


@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(feedback_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a feedback entry."""
    result = await db.feedback.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouvé")
    return {"message": "Feedback supprimé"}


# ═══════════════════════════════════════ INVITATIONS ══════════════════════════


class InvitationSend(BaseModel):
    email: EmailStr
    message: Optional[str] = None


@router.post("/invitations")
async def send_invitation(data: InvitationSend, admin: dict = Depends(get_current_admin)) -> dict:
    """Send an email invitation to create an account."""
    # Check if already invited
    existing = await db.invitations.find_one({"email": data.email.lower()})
    if existing and not existing.get("accepted"):
        raise HTTPException(status_code=400, detail="Invitation déjà envoyée à cette adresse")

    invite_token = secrets.token_urlsafe(32)
    invitation = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "message": data.message,
        "token": invite_token,
        "sent_by": admin["email"],
        "accepted": False,
        "created_at": datetime.now(UTC).isoformat(),
        "expires_at": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
    }
    await db.invitations.insert_one(invitation)

    # Build invite URL
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    invite_url = f"{frontend_url}/auth?invite={invite_token}"

    # Send email
    smtp_host = os.environ.get("SMTP_HOST")
    if smtp_host:
        await _send_invitation_email(data.email, invite_url, data.message)
    else:
        logger.info(f"[Invitation] Link for {data.email}: {invite_url}")

    return {"message": "Invitation envoyée", "id": invitation["id"]}


@router.get("/invitations")
async def list_invitations(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all sent invitations."""
    invitations = await db.invitations.find({}, {"_id": 0, "token": 0}).sort("created_at", -1).to_list(200)
    return invitations


# ═══════════════════════════════════════ MEDIA ════════════════════════════════


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity_type: str = "general",
    entity_id: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Upload a media file (image/thumbnail)."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Type de fichier non supporté: {file.content_type}")

    # Max 5MB
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    # Store in GridFS or local filesystem
    import base64
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"{file_id}.{ext}"

    # Store metadata in DB, file as base64 (for simplicity without object storage)
    media_doc = {
        "id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "uploaded_by": admin["email"],
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.media.insert_one(media_doc)

    return {"id": file_id, "filename": filename, "url": f"/api/admin-bo/media/{file_id}/file"}


@router.get("/media")
async def list_media(
    entity_type: Optional[str] = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all uploaded media."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    media = await db.media.find(query, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(200)
    return media


@router.get("/media/{media_id}/file")
async def get_media_file(media_id: str) -> None:
    """Serve a media file by ID."""
    from fastapi.responses import Response
    import base64

    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    content = base64.b64decode(media["data"])
    return Response(content=content, media_type=media["content_type"])


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a media file."""
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return {"message": "Fichier supprimé"}


# ═══════════════════════════════════════ SETTINGS ═════════════════════════════


class AppSettings(BaseModel):
    app_name: Optional[str] = None
    app_description: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    registration_open: Optional[bool] = None
    max_leagues_per_user: Optional[int] = None
    current_season: Optional[int] = None


@router.get("/settings")
async def get_settings(admin: dict = Depends(get_current_admin)) -> dict:
    """Get app settings."""
    settings = await db.app_settings.find_one({"_id": "global"})
    if not settings:
        settings = {
            "app_name": "Pronokif",
            "app_description": "Jeu de pronostics F1",
            "primary_color": "#f97316",
            "accent_color": "#06b6d4",
            "maintenance_mode": False,
            "registration_open": True,
            "max_leagues_per_user": 5,
            "current_season": 2025,
        }
    else:
        del settings["_id"]
    return settings


@router.put("/settings")
async def update_settings(data: AppSettings, admin: dict = Depends(get_current_admin)) -> dict:
    """Update app settings."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": updates},
        upsert=True,
    )
    return {"message": "Paramètres mis à jour"}


# ═══════════════════════════════════════ STATS DASHBOARD ══════════════════════


@router.get("/stats")
async def get_dashboard_stats(admin: dict = Depends(get_current_admin)) -> dict:
    """Get admin dashboard statistics."""
    total_users = await db.users.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    total_leagues = await db.leagues.count_documents({})
    total_races = await db.races.count_documents({})
    unread_feedbacks = await db.feedback.count_documents({"read": False})
    pending_invitations = await db.invitations.count_documents({"accepted": False})

    # Recent registrations (last 7 days)
    week_ago = (datetime.now(UTC) - timedelta(days=7)).isoformat()
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_leagues": total_leagues,
        "total_races": total_races,
        "unread_feedbacks": unread_feedbacks,
        "pending_invitations": pending_invitations,
        "new_users_week": new_users_week,
    }


# ═══════════════════════════════════════ EMAIL HELPERS ════════════════════════


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
        <h1 style="color: #f97316; font-size: 24px; margin-bottom: 16px;">🏎️ Pronokif Admin</h1>
        <p style="color: #ccc; margin-bottom: 24px;">Cliquez sur le bouton ci-dessous pour vous connecter au panneau d'administration.</p>
        <a href="{magic_url}" style="display: inline-block; background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Se connecter
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Ce lien expire dans {MAGIC_LINK_EXPIRY_MINUTES} minutes. Si vous n'avez pas demandé ce lien, ignorez ce message.</p>
      </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


async def _send_invitation_email(email: str, invite_url: str, message: Optional[str] = None) -> None:
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
    msg["Subject"] = "Invitation à rejoindre Pronokif 🏎️"
    msg["From"] = from_email
    msg["To"] = email

    personal_msg = f'<p style="color: #ccc; margin-bottom: 16px; font-style: italic;">"{message}"</p>' if message else ""

    html = f"""
    <html>
    <body style="font-family: sans-serif; background: #0a0f1a; color: #fff; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1a1f2e; border-radius: 16px; padding: 32px; border: 1px solid #333;">
        <h1 style="color: #f97316; font-size: 24px; margin-bottom: 16px;">🏎️ Bienvenue sur Pronokif !</h1>
        <p style="color: #ccc; margin-bottom: 16px;">Vous êtes invité(e) à rejoindre Pronokif, le jeu de pronostics F1 entre amis.</p>
        {personal_msg}
        <a href="{invite_url}" style="display: inline-block; background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Créer mon compte
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
