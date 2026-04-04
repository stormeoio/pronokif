"""
PRONOKIF - Authentication Utilities
Password hashing, JWT token management, and user authentication
"""
import bcrypt
import jwt
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str) -> str:
    """Create a JWT token for a user"""
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expiration, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get the current authenticated user"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_league_code() -> str:
    """Generate a random 6-character league code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


async def send_user_notification(user_id: str, message: str, notif_type: str = "info"):
    """Internal helper to send notification to a specific user"""
    notification = {
        "id": str(uuid.uuid4()),
        "title": notif_type.replace("_", " ").title(),
        "message": message,
        "type": notif_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "is_personal": True
    }
    await db.notifications.insert_one(notification)
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"unread_notifications": notification["id"]}}
    )


async def check_is_admin(user: dict) -> bool:
    """Check if user is an admin (league creator)"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    return len(user_leagues) > 0
