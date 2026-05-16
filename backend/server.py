from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import random
import string
import base64

# Import extended features
from features import (
    ALL_AVATARS, DEFAULT_AVATARS, TEAM_AVATARS, DRIVER_AVATARS,
    MISSIONS, XP_REWARDS, get_xp_for_level, get_level_from_xp,
    get_default_user_stats, check_mission_completion, get_user_mission_progress,
    AvatarUpdate, UserStats, MissionProgress, GlobalLeaderboardEntry,
    RaceWeekendLeaderboardEntry, ReactionGameResult, BatakGameResult, MinigameLeaderboardEntry
)

# Import refactored modules
from config import db, client, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, OPENF1_API, JOLPICA_API, logger
from data.f1_data import F1_DRIVERS_2026, F1_RACES_2026, F1_CIRCUITS
from services.auth import (
    security, hash_password, verify_password, create_token, 
    get_current_user, generate_league_code, send_user_notification
)
from services.scoring import calculate_points
from models.schemas import (
    UserCreate, UserLogin, UserSetUsername, UserResponse, TokenResponse,
    LeagueCreate, LeagueJoin, LeagueUpdate, LeagueResponse, LeaderboardEntry,
    TransferOwnershipRequest, ChatMessage, BonusBets,
    PredictionCreate, SprintPredictionCreate, MainPredictionCreate,
    CustomPredictionCreate, CustomPredictionChoice,
    RaceResponse, DriverResponse, RaceResultsInput, NotificationResponse
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Helper function to calculate predictions close time (15 min before FP1)
def get_predictions_close_time(race: dict) -> datetime:
    """Calculate when main race predictions close - 15 minutes before Q1 start"""
    quali_date = race.get("quali_date")
    quali_time = race.get("quali_time", "14:00")
    quali_datetime = datetime.fromisoformat(f"{quali_date}T{quali_time}:00+00:00")
    return quali_datetime - timedelta(minutes=15)

def get_sprint_predictions_close_time(race: dict) -> datetime:
    """Calculate when sprint predictions close - 15 minutes before SQ1 start (only for sprint weekends)"""
    if not race.get("is_sprint"):
        return None
    sprint_quali_date = race.get("sprint_quali_date")
    sprint_quali_time = race.get("sprint_quali_time", "10:30")
    sprint_quali_datetime = datetime.fromisoformat(f"{sprint_quali_date}T{sprint_quali_time}:00+00:00")
    return sprint_quali_datetime - timedelta(minutes=15)

app = FastAPI(title="PRONOKIF API")
api_router = APIRouter(prefix="/api")

# ==================== INCLUDE MODULAR ROUTES ====================
# Import route modules
from routes.auth import router as auth_router
from routes.leagues import router as leagues_router
from routes.predictions import router as predictions_router
from routes.races import router as races_router
from routes.minigames import router as minigames_router
from routes.feedback import router as feedback_router
from routes.notifications import router as notifications_router
from routes.profile import router as profile_router
from routes.avatars import router as avatars_router
from routes.leaderboards import router as leaderboards_router
from routes.drivers import router as drivers_router
from routes.results import router as results_router
from routes.admin_members import router as admin_members_router
from routes.admin_sync import router as admin_sync_router

# Include all extracted route modules
app.include_router(auth_router, prefix="/api")
app.include_router(leagues_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(races_router, prefix="/api")
app.include_router(minigames_router, prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(avatars_router, prefix="/api")
app.include_router(leaderboards_router, prefix="/api")
app.include_router(drivers_router, prefix="/api")
app.include_router(results_router, prefix="/api")
app.include_router(admin_members_router, prefix="/api")
app.include_router(admin_sync_router, prefix="/api")

# NOTE: Models are now in models/schemas.py
# NOTE: Auth helpers are now in services/auth.py
# NOTE: F1 data is now in data/f1_data.py


# F1 Data now in data/f1_data.py


# AUTH, LEAGUES, LEAGUE CHAT routes now in routes/auth.py, routes/leagues.py

# Public profile endpoint moved to routes/profile.py + services/profile.py (S1 lot 3).

# count_individual_predictions moved to services/predictions.py (S1 lot 3).
# Re-imported here so the admin endpoints still in this file (admin members,
# member details — to be extracted in S1 lot 6) keep working.
from services.predictions import count_individual_predictions  # noqa: F401


# ==================== ADMIN AUTHORIZATION ====================
# check_is_admin and ADMIN_EMAIL now live in services/admin.py.
# Re-imported here so the legacy endpoints still in this file (admin
# members, sync, etc — to be extracted in S1 lots 4-6) keep working
# without each having to import the helper directly.
from services.admin import check_is_admin, ADMIN_EMAIL  # noqa: F401  (used below)

# Feedback endpoints moved to routes/feedback.py + services/feedback.py (S1 lot 1).

# Admin members endpoints moved to routes/admin_members.py +
# services/admin_members.py (S1 lot 6).

# Results endpoints + scoring helpers moved to routes/results.py +
# services/results.py (S1 lot 5). The local SCORING_RULES /
# XP_REWARDS_SCORING / calculate_points were duplicates of
# services.scoring + config; the divergent (and unused)
# XP_REWARDS_SCORING fork has been dropped.
#
# Sync endpoints (OpenF1 integration, send-reminders,
# auto-sync-results, sync-all-pending, sync-status) moved to
# routes/admin_sync.py + services/sync.py (S1 lot 7).

# ==================== CUSTOM PREDICTIONS UI HELPERS ====================

@api_router.get("/custom-predictions/my-created")
async def get_my_created_custom_predictions(user=Depends(get_current_user)):
    """Get custom predictions created by the user"""
    predictions = await db.custom_predictions.find(
        {"created_by": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return predictions

@api_router.get("/custom-predictions/to-answer/{league_id}/{race_id}")
async def get_custom_predictions_to_answer(league_id: str, race_id: str, user=Depends(get_current_user)):
    """Get custom predictions that user can answer"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member")
    
    # Get all custom predictions for this league/race
    predictions = await db.custom_predictions.find(
        {"league_id": league_id, "race_id": race_id}, {"_id": 0}
    ).to_list(100)
    
    # Check which ones user has answered
    for pred in predictions:
        answer = await db.custom_prediction_answers.find_one(
            {"prediction_id": pred["id"], "user_id": user["id"]}, {"_id": 0}
        )
        pred["user_answer"] = answer.get("answer") if answer else None
        pred["has_answered"] = answer is not None
    
    return predictions

# Driver detail endpoints + DRIVER_PHOTOS map + generate_driver_facts() moved
# to routes/drivers.py + services/drivers.py (S1 lot 4).

# Sync status endpoints + sync_race_from_api helper moved to
# routes/admin_sync.py + services/sync.py (S1 lot 7).

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# Install the security middleware stack: strict CORS (no wildcard outside
# dev), conservative security headers (HSTS, X-Frame-Options, nosniff,
# Referrer-Policy, Permissions-Policy), and an optional slowapi rate
# limiter when the dependency is present. See backend/middleware/security.py.
from middleware.security import install as install_security
install_security(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== AUTO-SYNC SCHEDULER ====================
# The actual loop body lives in services/sync.auto_sync_loop. Keep
# the startup/shutdown wiring here so it stays attached to the
# FastAPI app instance.
from services.sync import auto_sync_loop

auto_sync_task = None

@app.on_event("startup")
async def startup_event():
    global auto_sync_task
    auto_sync_task = asyncio.create_task(auto_sync_loop())
    logger.info("[Auto-Sync] Background synchronization task started")

@app.on_event("shutdown")
async def shutdown_db_client():
    global auto_sync_task
    if auto_sync_task:
        auto_sync_task.cancel()
        try:
            await auto_sync_task
        except asyncio.CancelledError:
            pass
    client.close()
