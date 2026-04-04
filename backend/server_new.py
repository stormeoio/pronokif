"""
PRONOKIF - Main Server (Refactored)
FastAPI application with modular route structure
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, OPENF1_API, JOLPICA_API, logger
from data.f1_data import F1_DRIVERS_2026, F1_RACES_2026, F1_CIRCUITS
from services.auth import (
    security, hash_password, verify_password, create_token, 
    get_current_user, generate_league_code, send_user_notification
)
from services.scoring import calculate_points
from models.schemas import (
    UserCreate, UserLogin, UserSetUsername, UserResponse, TokenResponse,
    LeagueCreate, LeagueJoin, LeagueUpdate, LeagueResponse, LeaderboardEntry,
    TransferOwnershipRequest, ChatMessage,
    PredictionCreate, SprintPredictionCreate, MainPredictionCreate,
    CustomPredictionCreate, CustomPredictionChoice,
    RaceResponse, DriverResponse, RaceResultsInput
)

# Import route modules
from routes.auth import router as auth_router
from routes.leagues import router as leagues_router
from routes.predictions import router as predictions_router
from routes.races import router as races_router
from routes.minigames import router as minigames_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Re-export db for backward compatibility with features.py
from config import client

app = FastAPI(title="PRONOKIF API", description="F1 Predictions Game API")
api_router = APIRouter(prefix="/api")

# ==================== HELPER FUNCTIONS ====================

def get_predictions_close_time(race: dict) -> datetime:
    """Get the time when main race predictions close (15 min before Q1)"""
    quali_date = race["quali_date"]
    quali_time = race.get("quali_time", "14:00")
    quali_datetime = datetime.fromisoformat(f"{quali_date}T{quali_time}:00+00:00")
    return quali_datetime - timedelta(minutes=15)

def get_sprint_predictions_close_time(race: dict):
    """Get the time when sprint predictions close (15 min before SQ1)"""
    if not race.get("is_sprint"):
        return None
    sprint_quali_date = race.get("sprint_quali_date")
    sprint_quali_time = race.get("sprint_quali_time", "10:30")
    if sprint_quali_date:
        sq_datetime = datetime.fromisoformat(f"{sprint_quali_date}T{sprint_quali_time}:00+00:00")
        return sq_datetime - timedelta(minutes=15)
    return None

async def count_individual_predictions(user_id: str) -> int:
    """Count individual prediction elements for a user"""
    predictions = await db.predictions.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total = 0
    for pred in predictions:
        if pred.get("quali_pole"): total += 1
        if pred.get("quali_top10"): total += 1
        if pred.get("race_winner"): total += 1
        if pred.get("race_top10"): total += 1
        if pred.get("sprint_quali_pole"): total += 1
        if pred.get("sprint_quali_top10"): total += 1
        if pred.get("sprint_race_winner"): total += 1
        if pred.get("sprint_race_top10"): total += 1
        bonus = pred.get("bonus_bets", {})
        if bonus:
            if "safety_car" in bonus: total += 1
            if bonus.get("dnf_drivers"): total += 1
            if bonus.get("fastest_lap_driver"): total += 1
            if bonus.get("first_corner_leader"): total += 1
    return total

# ==================== INCLUDE MODULAR ROUTES ====================

# Include all extracted route modules
app.include_router(auth_router, prefix="/api")
app.include_router(leagues_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(races_router, prefix="/api")
app.include_router(minigames_router, prefix="/api")

# ==================== REMAINING ENDPOINTS (NOT YET EXTRACTED) ====================
# The following sections remain in server.py until fully extracted:
# - Public Profile
# - Admin endpoints (feedback, members, results, sync)
# - Avatars
# - User stats & missions
# - Global leaderboard
# - Driver details
# - Sync status endpoints
# - Auto-sync scheduler

