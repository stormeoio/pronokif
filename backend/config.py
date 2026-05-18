"""
PRONOKIF - Configuration Module
Database connection, JWT settings, API URLs, and constants
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


def _required_env(key: str) -> str:
    """Read a required env var or fail fast at boot with a clear message."""
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. See backend/.env.example for the full template."
        )
    return value


# MongoDB connection
MONGO_URL = _required_env("MONGO_URL")
DB_NAME = _required_env("DB_NAME")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Configuration
# SECURITY: no fallback. JWT_SECRET MUST come from the environment.
# Generate a strong secret with:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET = _required_env("JWT_SECRET")
if len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET is too short (< 32 chars). Generate a stronger one with "
        "`python -c 'import secrets; print(secrets.token_urlsafe(48))'`."
    )
JWT_ALGORITHM = "HS256"
# Access token: short-lived (1 hour). Refresh token: long-lived (7 days).
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Cookie settings — httpOnly cookies replace localStorage tokens (P0-2 fix)
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
COOKIE_SECURE = ENVIRONMENT not in ("development", "dev", "local")
COOKIE_SAMESITE: str = "lax"
COOKIE_DOMAIN: str | None = os.environ.get("COOKIE_DOMAIN")  # e.g. ".stormeo.io"

# External APIs
OPENF1_API = "https://api.openf1.org/v1"
JOLPICA_API = "https://api.jolpi.ca/ergast/f1"

# Scoring Rules
SCORING_RULES = {
    "quali_pole_exact": 5,
    "top10_exact_position": 3,
    "top10_in_top10": 1,
    "race_winner_exact": 10,
    "safety_car_correct": 3,
    "dnf_driver_correct": 2,
    "fastest_lap_correct": 5,
    "first_corner_leader": 3,
}

# XP Rewards for Scoring
XP_REWARDS_SCORING = {
    "correct_pole": 5,
    "correct_winner": 10,
    "bonus_correct": 3,
}

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
