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

# ==================== ADMIN MEMBERS MANAGEMENT ====================

@api_router.get("/admin/members")
async def get_all_members(user=Depends(get_current_user)):
    """Get all registered members (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    members = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Enrich with stats
    for member in members:
        # Use helper function to count individual predictions
        member["predictions_count"] = await count_individual_predictions(member["id"])
        
        # Get leagues count
        leagues = await db.leagues.count_documents({"members": member["id"]})
        member["leagues_count"] = leagues
        
    return members

@api_router.get("/admin/members/{member_id}")
async def get_member_details(member_id: str, user=Depends(get_current_user)):
    """Get detailed info about a specific member (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get stats
    stats = await db.user_stats.find_one({"user_id": member_id}, {"_id": 0})
    if not stats:
        stats = get_default_user_stats()
    
    # Use helper function to count individual predictions
    predictions_count = await count_individual_predictions(member_id)
    
    # Count races participated
    races_participated = await db.predictions.count_documents({"user_id": member_id})
    
    # Get leagues
    leagues = await db.leagues.find({"members": member_id}, {"_id": 0}).to_list(100)
    
    # Get recent predictions
    recent_predictions = await db.predictions.find(
        {"user_id": member_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Map race names
    race_map = {r["id"]: r["name"] for r in F1_RACES_2026}
    for pred in recent_predictions:
        pred["race_name"] = race_map.get(pred["race_id"], pred["race_id"])
    
    # Get minigame scores
    minigame_scores = await db.minigame_scores.find(
        {"user_id": member_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "id": member["id"],
        "email": member.get("email"),
        "username": member.get("username", "Anonymous"),
        "avatar_id": member.get("avatar_id"),
        "custom_avatar_url": member.get("custom_avatar_url"),
        "level": member.get("level", 1),
        "xp": member.get("xp", 0),
        "created_at": member.get("created_at"),
        "current_league_id": member.get("current_league_id"),
        "stats": {
            "predictions_count": predictions_count,
            "correct_poles": stats.get("correct_poles", 0),
            "correct_winners": stats.get("correct_winners", 0),
            "perfect_top10": stats.get("perfect_top10", 0),
            "races_participated": races_participated
        },
        "leagues": [{"id": league["id"], "name": league["name"], "members_count": len(league["members"])} for league in leagues],
        "recent_predictions": recent_predictions,
        "minigame_scores": minigame_scores
    }

@api_router.get("/admin/members/{member_id}/activity")
async def get_member_activity(member_id: str, user=Depends(get_current_user)):
    """Get login activity history for a specific member (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get login sessions
    sessions = await db.user_sessions.find(
        {"user_id": member_id},
        {"_id": 0}
    ).sort("login_at", -1).limit(50).to_list(50)
    
    return {
        "member_id": member_id,
        "username": member.get("username", "Anonymous"),
        "last_login_at": member.get("last_login_at"),
        "sessions": sessions
    }

@api_router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, user=Depends(get_current_user)):
    """Delete a member account (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent admin from deleting themselves
    if member_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Remove user from all leagues
    await db.leagues.update_many(
        {"members": member_id},
        {"$pull": {"members": member_id}}
    )
    
    # Remove from leaderboard entries
    await db.leaderboard.delete_many({"user_id": member_id})
    
    # Delete user predictions
    await db.predictions.delete_many({"user_id": member_id})
    
    # Delete user stats
    await db.user_stats.delete_one({"user_id": member_id})
    
    # Delete user sessions
    await db.user_sessions.delete_many({"user_id": member_id})
    
    # Delete user minigame scores
    await db.minigame_scores.delete_many({"user_id": member_id})
    
    # Delete chat read status
    await db.chat_read_status.delete_many({"user_id": member_id})
    
    # Delete notification read status
    await db.notification_reads.delete_many({"user_id": member_id})
    
    # Delete feedback from this user
    await db.feedback.delete_many({"user_id": member_id})
    
    # Finally delete the user
    await db.users.delete_one({"id": member_id})
    
    return {"status": "success", "message": f"Member {member.get('username', member.get('email'))} deleted successfully"}

# Notifications endpoints moved to routes/notifications.py + services/notifications.py (S1 lot 2).

# RACES, PREDICTIONS routes are in routes/races.py, routes/predictions.py.
# Driver detail endpoints moved to routes/drivers.py + services/drivers.py (S1 lot 4).

# ==================== RESULTS & SCORING ====================

SCORING_RULES = {
    "quali_pole_exact": 5,
    "top10_exact_position": 3,
    "top10_in_top10": 1,
    "race_winner_exact": 10,
    "safety_car_correct": 3,
    "dnf_driver_correct": 2,  # Per correct DNF driver
    "fastest_lap_correct": 5,
    "first_corner_leader": 3,
}

# XP rewards for scoring (local copy - different from features.py)
XP_REWARDS_SCORING = {
    "prediction_made": 10,
    "correct_pole": 20,
    "correct_winner": 30,
    "bonus_correct": 15,
}

def calculate_points(prediction: dict, results: dict) -> dict:
    points = {
        "quali_pole": 0, "quali_top10": 0, "sprint_quali_top10": 0,
        "sprint_race_top10": 0, "race_winner": 0, "race_top10": 0,
        "bonus": 0, "total": 0, "xp_earned": 0, "details": []
    }
    
    # Quali Pole
    if prediction.get("quali_pole") == results.get("quali_pole"):
        points["quali_pole"] = SCORING_RULES["quali_pole_exact"]
        points["xp_earned"] += XP_REWARDS_SCORING["correct_pole"]
        points["details"].append(f"Pole exacte: +{SCORING_RULES['quali_pole_exact']} pts")
    
    # Quali Top 10
    actual_quali = results.get("quali_top10", [])
    for i, driver in enumerate(prediction.get("quali_top10", [])):
        if i < len(actual_quali) and driver == actual_quali[i]:
            points["quali_top10"] += SCORING_RULES["top10_exact_position"]
            points["details"].append(f"Quali P{i+1} exact: +3 pts")
        elif driver in actual_quali:
            points["quali_top10"] += SCORING_RULES["top10_in_top10"]
    
    # Sprint Quali Top 10
    actual_sprint_quali = results.get("sprint_quali_top10", [])
    for i, driver in enumerate(prediction.get("sprint_quali_top10") or []):
        if i < len(actual_sprint_quali) and driver == actual_sprint_quali[i]:
            points["sprint_quali_top10"] += SCORING_RULES["top10_exact_position"]
        elif driver in actual_sprint_quali:
            points["sprint_quali_top10"] += SCORING_RULES["top10_in_top10"]
    
    # Sprint Race Top 10
    actual_sprint_race = results.get("sprint_race_top10", [])
    for i, driver in enumerate(prediction.get("sprint_race_top10") or []):
        if i < len(actual_sprint_race) and driver == actual_sprint_race[i]:
            points["sprint_race_top10"] += SCORING_RULES["top10_exact_position"]
        elif driver in actual_sprint_race:
            points["sprint_race_top10"] += SCORING_RULES["top10_in_top10"]
    
    # Race Winner
    if prediction.get("race_winner") == results.get("race_winner"):
        points["race_winner"] = SCORING_RULES["race_winner_exact"]
        points["xp_earned"] += XP_REWARDS_SCORING["correct_winner"]
        points["details"].append("Vainqueur exact: +10 pts")
    
    # Race Top 10
    actual_race = results.get("race_top10", [])
    for i, driver in enumerate(prediction.get("race_top10", [])):
        if i < len(actual_race) and driver == actual_race[i]:
            points["race_top10"] += SCORING_RULES["top10_exact_position"]
            points["details"].append(f"Course P{i+1} exact: +3 pts")
        elif driver in actual_race:
            points["race_top10"] += SCORING_RULES["top10_in_top10"]
    
    # Bonus Bets
    pred_bonus = prediction.get("bonus_bets", {}) or {}
    results_bonus = results.get("bonus", {}) or {}
    
    # Safety Car
    if pred_bonus.get("safety_car") == results_bonus.get("safety_car"):
        points["bonus"] += SCORING_RULES["safety_car_correct"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Safety Car correct: +3 pts")
    
    # DNF Drivers (new logic - points per correct driver)
    pred_dnf = pred_bonus.get("dnf_drivers", [])
    actual_dnf = results_bonus.get("dnf_drivers", [])
    for driver in pred_dnf:
        if driver in actual_dnf:
            points["bonus"] += SCORING_RULES["dnf_driver_correct"]
            points["details"].append(f"DNF {driver} correct: +2 pts")
    
    # Fastest Lap
    if pred_bonus.get("fastest_lap_driver") == results_bonus.get("fastest_lap"):
        points["bonus"] += SCORING_RULES["fastest_lap_correct"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Meilleur tour exact: +5 pts")
    
    # First Corner Leader
    if pred_bonus.get("first_corner_leader") == results_bonus.get("first_corner_leader"):
        points["bonus"] += SCORING_RULES["first_corner_leader"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Leader 1er virage exact: +3 pts")
    
    points["total"] = (points["quali_pole"] + points["quali_top10"] + points["sprint_quali_top10"] +
                       points["sprint_race_top10"] + points["race_winner"] + points["race_top10"] + points["bonus"])
    return points

# Results input model
class RaceResultsInput(BaseModel):
    quali_pole: str
    quali_top10: List[str]
    sprint_quali_top10: Optional[List[str]] = None
    sprint_race_top10: Optional[List[str]] = None
    race_winner: str
    race_top10: List[str]
    safety_car: bool = False
    dnf_drivers: List[str] = []
    fastest_lap: Optional[str] = None
    first_corner_leader: Optional[str] = None

@api_router.get("/results/{race_id}")
async def get_race_results(race_id: str, user=Depends(get_current_user)):
    result = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Results not available yet")
    
    prediction = await db.predictions.find_one({"user_id": user["id"], "race_id": race_id}, {"_id": 0})
    points = calculate_points(prediction, result["results"]) if prediction else None
    
    return {"results": result["results"], "prediction": prediction, "points": points}

# ==================== ADMIN ENDPOINTS ====================

@api_router.post("/admin/results/{race_id}")
async def set_race_results(race_id: str, data: RaceResultsInput, user=Depends(get_current_user)):
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    if not user_leagues:
        raise HTTPException(status_code=403, detail="Only league creators can enter results")
    
    results = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "sprint_quali_top10": data.sprint_quali_top10,
        "sprint_race_top10": data.sprint_race_top10,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus": {
            "safety_car": data.safety_car,
            "dnf_drivers": data.dnf_drivers,
            "fastest_lap": data.fastest_lap,
            "first_corner_leader": data.first_corner_leader
        }
    }
    
    await db.race_results.update_one(
        {"race_id": race_id},
        {"$set": {"race_id": race_id, "results": results, "entered_by": user["id"], 
                  "entered_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    # Calculate points for all predictions
    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
    
    for pred in predictions:
        points = calculate_points(pred, results)
        
        await db.users.update_one({"id": pred["user_id"]}, {"$inc": {"xp": points["xp_earned"]}})
        
        user_data = await db.users.find_one({"id": pred["user_id"]}, {"_id": 0})
        if user_data:
            new_xp = user_data.get("xp", 0) + points["xp_earned"]
            new_level = (new_xp // 100) + 1
            if new_level > user_data.get("level", 1):
                await db.users.update_one({"id": pred["user_id"]}, {"$set": {"level": new_level}})
                await send_user_notification(pred["user_id"], f"Niveau {new_level} atteint !", "level_up")
            
            race_name = next((r["name"] for r in F1_RACES_2026 if r["id"] == race_id), race_id)
            await send_user_notification(pred["user_id"], f"Résultats {race_name}: +{points['total']} pts!", "results")
            
            leagues = await db.leagues.find({"members": pred["user_id"]}, {"_id": 0}).to_list(100)
            for league in leagues:
                entry = await db.leaderboard.find_one({"league_id": league["id"], "user_id": pred["user_id"]})
                if entry:
                    all_entries = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
                    all_entries.sort(key=lambda x: x["total_points"], reverse=True)
                    current_pos = next((i+1 for i, e in enumerate(all_entries) if e["user_id"] == pred["user_id"]), len(all_entries))
                    
                    await db.leaderboard.update_one(
                        {"id": entry["id"]},
                        {"$inc": {"total_points": points["total"]},
                         "$set": {"last_race_points": points["total"], "previous_position": current_pos}}
                    )
    
    await db.predictions.update_many({"race_id": race_id}, {"$set": {"locked": True}})
    return {"message": "Results saved", "predictions_processed": len(predictions)}

@api_router.get("/admin/races")
async def get_admin_races(user=Depends(get_current_user)):
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    if not user_leagues:
        raise HTTPException(status_code=403, detail="Access denied")
    
    races_with_status = []
    for race in F1_RACES_2026:
        result = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        
        races_with_status.append({
            "id": race["id"], "name": race["name"], "date": race["date"],
            "has_results": result is not None,
            "is_past": datetime.now(timezone.utc) > race_date,
            "is_sprint": race.get("is_sprint", False)
        })
    return races_with_status

@api_router.get("/admin/results/{race_id}")
async def get_admin_results(race_id: str, user=Depends(get_current_user)):
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    if not user_leagues:
        raise HTTPException(status_code=403, detail="Access denied")
    return await db.race_results.find_one({"race_id": race_id}, {"_id": 0})

# ==================== OPENF1 API INTEGRATION ====================

@api_router.post("/admin/sync-results/{race_id}")
async def sync_results_from_openf1(race_id: str, user=Depends(get_current_user)):
    """Fetch all results from Jolpica and OpenF1 APIs - includes quali, race, sprint, DNF, safety car, fastest lap"""
    # Allow league creators OR admin to sync results
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    is_admin = await check_is_admin(user)
    if not user_leagues and not is_admin:
        raise HTTPException(status_code=403, detail="Admin or league creator access required")
    
    # Find race info
    race = next((r for r in F1_RACES_2026 if r["id"] == race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # Map circuit names to Jolpica round numbers (we need to figure out the round)
    race_date = race.get("date", "")
    year = race_date.split("-")[0] if race_date else "2026"
    
    # Create driver number to ID mapping
    number_to_id = {d["number"]: d["id"] for d in F1_DRIVERS_2026}
    driver_id_to_name = {d["id"]: d["name"] for d in F1_DRIVERS_2026}
    
    fetched_data = {
        "quali_pole": None,
        "quali_top10": [],
        "sprint_quali_pole": None,
        "sprint_quali_top10": [],
        "sprint_race_winner": None,
        "sprint_race_top10": [],
        "race_winner": None,
        "race_top10": [],
        "bonus": {
            "safety_car": None,
            "dnf_drivers": [],
            "fastest_lap": None,
            "first_corner_leader": None,
            "sprint_first_corner_leader": None
        }
    }
    
    errors = []
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Step 1: Get race schedule from Jolpica to find the round number
            schedule_resp = await client.get(f"{JOLPICA_API}/{year}.json")
            round_number = None
            
            if schedule_resp.status_code == 200:
                schedule_data = schedule_resp.json()
                races_list = schedule_data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
                
                # Match by date or circuit name
                circuit_name = race.get("circuit", "").lower()
                for r in races_list:
                    r_circuit = r.get("Circuit", {}).get("circuitId", "").lower()
                    r_date = r.get("date", "")
                    if race_date == r_date or circuit_name in r_circuit or r_circuit in circuit_name:
                        round_number = r.get("round")
                        break
            
            if not round_number:
                # Try matching by race name
                race_name = race.get("name", "").lower().replace("grand prix", "").strip()
                for r in races_list:
                    r_name = r.get("raceName", "").lower().replace("grand prix", "").strip()
                    if race_name in r_name or r_name in race_name:
                        round_number = r.get("round")
                        break
            
            if not round_number:
                errors.append(f"Could not find round number for {race.get('name')}")
            else:
                # Step 2: Fetch qualifying results
                try:
                    quali_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/qualifying.json")
                    if quali_resp.status_code == 200:
                        quali_data = quali_resp.json()
                        quali_results = quali_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("QualifyingResults", [])
                        
                        if quali_results:
                            # Pole position (P1)
                            pole_driver = quali_results[0].get("Driver", {})
                            pole_number = pole_driver.get("permanentNumber")
                            if pole_number:
                                fetched_data["quali_pole"] = number_to_id.get(int(pole_number))
                            
                            # Top 10
                            for i, result in enumerate(quali_results[:10]):
                                driver_num = result.get("Driver", {}).get("permanentNumber")
                                if driver_num:
                                    driver_id = number_to_id.get(int(driver_num))
                                    if driver_id:
                                        fetched_data["quali_top10"].append(driver_id)
                except Exception as e:
                    errors.append(f"Qualifying: {str(e)}")
                
                # Step 3: Fetch race results
                try:
                    race_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/results.json")
                    if race_resp.status_code == 200:
                        race_data = race_resp.json()
                        race_results = race_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("Results", [])
                        
                        if race_results:
                            # Race winner
                            winner = race_results[0].get("Driver", {})
                            winner_num = winner.get("permanentNumber")
                            if winner_num:
                                fetched_data["race_winner"] = number_to_id.get(int(winner_num))
                            
                            # Top 10
                            for result in race_results[:10]:
                                driver_num = result.get("Driver", {}).get("permanentNumber")
                                if driver_num:
                                    driver_id = number_to_id.get(int(driver_num))
                                    if driver_id:
                                        fetched_data["race_top10"].append(driver_id)
                            
                            # DNF drivers (status not "Finished" and not laps related like "+1 Lap")
                            dnf_statuses = ["Accident", "Collision", "Engine", "Gearbox", "Hydraulics", 
                                           "Brakes", "Suspension", "Electrical", "Retired", "Mechanical",
                                           "Power Unit", "Oil leak", "Water leak", "Overheating", "Spun off"]
                            for result in race_results:
                                status = result.get("status", "")
                                if any(dnf in status for dnf in dnf_statuses):
                                    driver_num = result.get("Driver", {}).get("permanentNumber")
                                    if driver_num:
                                        driver_id = number_to_id.get(int(driver_num))
                                        if driver_id:
                                            fetched_data["bonus"]["dnf_drivers"].append(driver_id)
                            
                            # Fastest lap
                            for result in race_results:
                                fastest_lap = result.get("FastestLap", {})
                                if fastest_lap.get("rank") == "1":
                                    driver_num = result.get("Driver", {}).get("permanentNumber")
                                    if driver_num:
                                        fetched_data["bonus"]["fastest_lap"] = number_to_id.get(int(driver_num))
                                    break
                except Exception as e:
                    errors.append(f"Race: {str(e)}")
                
                # Step 4: Fetch sprint results if it's a sprint weekend
                if race.get("is_sprint"):
                    try:
                        sprint_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/sprint.json")
                        if sprint_resp.status_code == 200:
                            sprint_data = sprint_resp.json()
                            sprint_results = sprint_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("SprintResults", [])
                            
                            if sprint_results:
                                # Sprint winner
                                sprint_winner = sprint_results[0].get("Driver", {})
                                sprint_winner_num = sprint_winner.get("permanentNumber")
                                if sprint_winner_num:
                                    fetched_data["sprint_race_winner"] = number_to_id.get(int(sprint_winner_num))
                                
                                # Sprint Top 10
                                for result in sprint_results[:10]:
                                    driver_num = result.get("Driver", {}).get("permanentNumber")
                                    if driver_num:
                                        driver_id = number_to_id.get(int(driver_num))
                                        if driver_id:
                                            fetched_data["sprint_race_top10"].append(driver_id)
                    except Exception as e:
                        errors.append(f"Sprint: {str(e)}")
            
            # Step 5: Try OpenF1 for additional data (safety car, first corner leader)
            try:
                # Get meetings from OpenF1 to find this race
                meetings_resp = await client.get(f"{OPENF1_API}/meetings", params={"year": int(year)})
                if meetings_resp.status_code == 200:
                    meetings = meetings_resp.json()
                    
                    # Find matching meeting
                    circuit_name = race.get("circuit", "").lower()
                    race_name = race.get("name", "").lower()
                    meeting = None
                    
                    for m in meetings:
                        m_name = (m.get("meeting_name", "") + " " + m.get("circuit_short_name", "")).lower()
                        if any(word in m_name for word in circuit_name.split()[:2]) or \
                           any(word in m_name for word in race_name.replace("grand prix", "").split()[:2]):
                            meeting = m
                            break
                    
                    if meeting:
                        meeting_key = meeting.get("meeting_key")
                        
                        # Get sessions for this meeting
                        sessions_resp = await client.get(f"{OPENF1_API}/sessions", params={"meeting_key": meeting_key})
                        if sessions_resp.status_code == 200:
                            sessions = sessions_resp.json()
                            
                            race_session = next((s for s in sessions if s.get("session_name") == "Race"), None)
                            sprint_session = next((s for s in sessions if s.get("session_name") == "Sprint"), None)
                            
                            # Get race car data to check for safety car
                            if race_session:
                                session_key = race_session.get("session_key")
                                
                                # Check for safety car in race control messages
                                rc_resp = await client.get(f"{OPENF1_API}/race_control", params={"session_key": session_key})
                                if rc_resp.status_code == 200:
                                    rc_messages = rc_resp.json()
                                    for msg in rc_messages:
                                        category = msg.get("category", "").lower()
                                        message = msg.get("message", "").lower()
                                        if "safety car" in category or "safety car" in message or "safetycar" in message:
                                            fetched_data["bonus"]["safety_car"] = True
                                            break
                                    
                                    # If no safety car found in messages, set to False (not None)
                                    if fetched_data["bonus"]["safety_car"] is None:
                                        fetched_data["bonus"]["safety_car"] = False
                                
                                # Get positions for first corner leader
                                pos_resp = await client.get(f"{OPENF1_API}/position", params={"session_key": session_key})
                                if pos_resp.status_code == 200:
                                    positions = pos_resp.json()
                                    # Find first position after race start (position 1 after initial positions)
                                    p1_positions = [p for p in positions if p.get("position") == 1]
                                    if len(p1_positions) > 1:
                                        # The second P1 entry is likely after first corner
                                        first_corner_leader_num = p1_positions[1].get("driver_number")
                                        if first_corner_leader_num:
                                            fetched_data["bonus"]["first_corner_leader"] = number_to_id.get(first_corner_leader_num)
                            
                            # Get sprint first corner leader
                            if sprint_session:
                                session_key = sprint_session.get("session_key")
                                pos_resp = await client.get(f"{OPENF1_API}/position", params={"session_key": session_key})
                                if pos_resp.status_code == 200:
                                    positions = pos_resp.json()
                                    p1_positions = [p for p in positions if p.get("position") == 1]
                                    if len(p1_positions) > 1:
                                        sprint_leader_num = p1_positions[1].get("driver_number")
                                        if sprint_leader_num:
                                            fetched_data["bonus"]["sprint_first_corner_leader"] = number_to_id.get(sprint_leader_num)
            except Exception as e:
                errors.append(f"OpenF1 data: {str(e)}")
    
    except Exception as e:
        logging.error(f"API sync error: {e}")
        return {"status": "error", "message": str(e), "manual_entry_required": True}
    
    # Calculate what was successfully fetched
    success_items = []
    if fetched_data["quali_pole"]:
        success_items.append("Pole position")
    if len(fetched_data["quali_top10"]) == 10:
        success_items.append("Top 10 qualifs")
    if fetched_data["race_winner"]:
        success_items.append("Vainqueur course")
    if len(fetched_data["race_top10"]) == 10:
        success_items.append("Top 10 course")
    if fetched_data["bonus"]["fastest_lap"]:
        success_items.append("Meilleur tour")
    if fetched_data["bonus"]["safety_car"] is not None:
        success_items.append(f"Safety Car: {'OUI' if fetched_data['bonus']['safety_car'] else 'NON'}")
    if fetched_data["bonus"]["dnf_drivers"]:
        success_items.append(f"DNF: {len(fetched_data['bonus']['dnf_drivers'])} pilotes")
    if fetched_data["bonus"]["first_corner_leader"]:
        success_items.append("Leader 1er virage")
    if fetched_data["sprint_race_winner"]:
        success_items.append("Vainqueur sprint")
    
    return {
        "status": "success" if success_items else "partial",
        "fetched_data": fetched_data,
        "success_items": success_items,
        "errors": errors,
        "message": f"Récupéré: {', '.join(success_items) if success_items else 'Aucune donnée'}"
    }

@api_router.post("/admin/send-reminders")
async def send_reminder_notifications(user=Depends(get_current_user)):
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    if not user_leagues:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc)
    notifications_sent = 0
    
    for race in F1_RACES_2026:
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        time_until_close = predictions_close - now
        
        if timedelta(hours=23) < time_until_close < timedelta(hours=25):
            all_users = await db.users.find({}, {"_id": 0}).to_list(10000)
            for u in all_users:
                if not u.get("id"):
                    continue
                existing = await db.predictions.find_one({"user_id": u["id"], "race_id": race["id"]})
                if not existing:
                    await send_user_notification(u["id"], f"Rappel: Pronos {race['name']} ferment dans 24h!", "reminder")
                    notifications_sent += 1
    
    return {"message": f"{notifications_sent} reminders sent"}

@api_router.post("/admin/auto-sync-results/{race_id}")
async def auto_sync_and_save_results(race_id: str, user=Depends(get_current_user)):
    """Automatically fetch results from APIs and save them to database"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    is_admin = await check_is_admin(user)
    if not user_leagues and not is_admin:
        raise HTTPException(status_code=403, detail="Admin or league creator access required")
    
    # Find race info
    race = next((r for r in F1_RACES_2026 if r["id"] == race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # Get the sync data
    race_date = race.get("date", "")
    year = race_date.split("-")[0] if race_date else "2026"
    
    number_to_id = {d["number"]: d["id"] for d in F1_DRIVERS_2026}
    
    fetched_data = {
        "quali_pole": None,
        "quali_top10": [],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": None,
        "race_top10": [],
        "bonus": {
            "safety_car": None,
            "dnf_drivers": [],
            "fastest_lap": None,
            "first_corner_leader": None
        }
    }
    
    errors = []
    round_number = None
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Get round number from schedule
            schedule_resp = await client.get(f"{JOLPICA_API}/{year}.json")
            
            if schedule_resp.status_code == 200:
                schedule_data = schedule_resp.json()
                races_list = schedule_data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
                
                circuit_name = race.get("circuit", "").lower()
                race_name = race.get("name", "").lower().replace("grand prix", "").strip()
                
                for r in races_list:
                    r_circuit = r.get("Circuit", {}).get("circuitId", "").lower()
                    r_name = r.get("raceName", "").lower().replace("grand prix", "").strip()
                    r_date = r.get("date", "")
                    
                    if race_date == r_date or circuit_name in r_circuit or r_circuit in circuit_name or \
                       race_name in r_name or r_name in race_name:
                        round_number = r.get("round")
                        break
            
            if not round_number:
                return {"status": "error", "message": f"Could not find round number for {race.get('name')}", "errors": ["Round not found"]}
            
            # Fetch qualifying
            try:
                quali_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/qualifying.json")
                if quali_resp.status_code == 200:
                    quali_data = quali_resp.json()
                    quali_results = quali_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("QualifyingResults", [])
                    
                    if quali_results:
                        pole_num = quali_results[0].get("Driver", {}).get("permanentNumber")
                        if pole_num:
                            fetched_data["quali_pole"] = number_to_id.get(int(pole_num))
                        
                        for result in quali_results[:10]:
                            driver_num = result.get("Driver", {}).get("permanentNumber")
                            if driver_num:
                                driver_id = number_to_id.get(int(driver_num))
                                if driver_id:
                                    fetched_data["quali_top10"].append(driver_id)
            except Exception as e:
                errors.append(f"Qualifying: {str(e)}")
            
            # Fetch race results
            try:
                race_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/results.json")
                if race_resp.status_code == 200:
                    race_data = race_resp.json()
                    race_results = race_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("Results", [])
                    
                    if race_results:
                        winner_num = race_results[0].get("Driver", {}).get("permanentNumber")
                        if winner_num:
                            fetched_data["race_winner"] = number_to_id.get(int(winner_num))
                        
                        for result in race_results[:10]:
                            driver_num = result.get("Driver", {}).get("permanentNumber")
                            if driver_num:
                                driver_id = number_to_id.get(int(driver_num))
                                if driver_id:
                                    fetched_data["race_top10"].append(driver_id)
                        
                        # DNF drivers
                        dnf_statuses = ["Accident", "Collision", "Engine", "Gearbox", "Hydraulics", 
                                       "Brakes", "Suspension", "Electrical", "Retired", "Mechanical",
                                       "Power Unit", "Oil leak", "Water leak", "Overheating", "Spun off"]
                        for result in race_results:
                            status = result.get("status", "")
                            if any(dnf in status for dnf in dnf_statuses):
                                driver_num = result.get("Driver", {}).get("permanentNumber")
                                if driver_num:
                                    driver_id = number_to_id.get(int(driver_num))
                                    if driver_id:
                                        fetched_data["bonus"]["dnf_drivers"].append(driver_id)
                        
                        # Fastest lap
                        for result in race_results:
                            fastest_lap = result.get("FastestLap", {})
                            if fastest_lap.get("rank") == "1":
                                driver_num = result.get("Driver", {}).get("permanentNumber")
                                if driver_num:
                                    fetched_data["bonus"]["fastest_lap"] = number_to_id.get(int(driver_num))
                                break
            except Exception as e:
                errors.append(f"Race: {str(e)}")
            
            # Fetch sprint if applicable
            if race.get("is_sprint"):
                try:
                    sprint_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/sprint.json")
                    if sprint_resp.status_code == 200:
                        sprint_data = sprint_resp.json()
                        sprint_results = sprint_data.get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("SprintResults", [])
                        
                        if sprint_results:
                            for result in sprint_results[:10]:
                                driver_num = result.get("Driver", {}).get("permanentNumber")
                                if driver_num:
                                    driver_id = number_to_id.get(int(driver_num))
                                    if driver_id:
                                        fetched_data["sprint_race_top10"].append(driver_id)
                except Exception as e:
                    errors.append(f"Sprint: {str(e)}")
            
            # OpenF1 for safety car
            try:
                meetings_resp = await client.get(f"{OPENF1_API}/meetings", params={"year": int(year)})
                if meetings_resp.status_code == 200:
                    meetings = meetings_resp.json()
                    circuit_name = race.get("circuit", "").lower()
                    race_name = race.get("name", "").lower()
                    
                    meeting = None
                    for m in meetings:
                        m_name = (m.get("meeting_name", "") + " " + m.get("circuit_short_name", "")).lower()
                        if any(word in m_name for word in circuit_name.split()[:2]) or \
                           any(word in m_name for word in race_name.replace("grand prix", "").split()[:2]):
                            meeting = m
                            break
                    
                    if meeting:
                        meeting_key = meeting.get("meeting_key")
                        sessions_resp = await client.get(f"{OPENF1_API}/sessions", params={"meeting_key": meeting_key})
                        if sessions_resp.status_code == 200:
                            sessions = sessions_resp.json()
                            race_session = next((s for s in sessions if s.get("session_name") == "Race"), None)
                            
                            if race_session:
                                session_key = race_session.get("session_key")
                                rc_resp = await client.get(f"{OPENF1_API}/race_control", params={"session_key": session_key})
                                if rc_resp.status_code == 200:
                                    rc_messages = rc_resp.json()
                                    for msg in rc_messages:
                                        category = msg.get("category", "").lower()
                                        message = msg.get("message", "").lower()
                                        if "safety car" in category or "safety car" in message:
                                            fetched_data["bonus"]["safety_car"] = True
                                            break
                                    if fetched_data["bonus"]["safety_car"] is None:
                                        fetched_data["bonus"]["safety_car"] = False
                                
                                # First corner leader
                                pos_resp = await client.get(f"{OPENF1_API}/position", params={"session_key": session_key})
                                if pos_resp.status_code == 200:
                                    positions = pos_resp.json()
                                    p1_positions = [p for p in positions if p.get("position") == 1]
                                    if len(p1_positions) > 1:
                                        first_corner_leader_num = p1_positions[1].get("driver_number")
                                        if first_corner_leader_num:
                                            fetched_data["bonus"]["first_corner_leader"] = number_to_id.get(first_corner_leader_num)
            except Exception as e:
                errors.append(f"OpenF1: {str(e)}")
    
    except Exception as e:
        return {"status": "error", "message": str(e), "errors": [str(e)]}
    
    # Now save the results to database
    if fetched_data["race_winner"] or len(fetched_data["race_top10"]) > 0:
        results = {
            "quali_pole": fetched_data["quali_pole"],
            "quali_top10": fetched_data["quali_top10"],
            "sprint_quali_top10": fetched_data["sprint_quali_top10"],
            "sprint_race_top10": fetched_data["sprint_race_top10"],
            "race_winner": fetched_data["race_winner"],
            "race_top10": fetched_data["race_top10"],
            "bonus": fetched_data["bonus"]
        }
        
        await db.race_results.update_one(
            {"race_id": race_id},
            {"$set": {"race_id": race_id, "results": results, "entered_by": user["id"], 
                      "entered_at": datetime.now(timezone.utc).isoformat(), "auto_synced": True}},
            upsert=True
        )
        
        # Calculate points for all predictions
        predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
        points_calculated = 0
        
        for pred in predictions:
            points = calculate_points(pred, results)
            await db.users.update_one({"id": pred["user_id"]}, {"$inc": {"xp": points["xp_earned"]}})
            
            user_data = await db.users.find_one({"id": pred["user_id"]}, {"_id": 0})
            if user_data:
                new_xp = user_data.get("xp", 0) + points["xp_earned"]
                new_level = (new_xp // 100) + 1
                if new_level > user_data.get("level", 1):
                    await db.users.update_one({"id": pred["user_id"]}, {"$set": {"level": new_level}})
                    await send_user_notification(pred["user_id"], f"Niveau {new_level} atteint !", "level_up")
                
                await send_user_notification(pred["user_id"], f"Résultats {race['name']}: +{points['total']} pts!", "results")
                points_calculated += 1
        
        success_items = []
        if fetched_data["quali_pole"]: success_items.append("Pole position")
        if len(fetched_data["quali_top10"]) == 10: success_items.append("Top 10 qualifs")
        if fetched_data["race_winner"]: success_items.append("Vainqueur course")
        if len(fetched_data["race_top10"]) == 10: success_items.append("Top 10 course")
        if fetched_data["bonus"]["fastest_lap"]: success_items.append("Meilleur tour")
        if fetched_data["bonus"]["safety_car"] is not None: success_items.append(f"Safety Car: {'OUI' if fetched_data['bonus']['safety_car'] else 'NON'}")
        if fetched_data["bonus"]["dnf_drivers"]: success_items.append(f"DNF: {len(fetched_data['bonus']['dnf_drivers'])} pilotes")
        
        return {
            "status": "success",
            "message": f"Résultats synchronisés et sauvegardés! {points_calculated} pronostics calculés.",
            "fetched_data": fetched_data,
            "success_items": success_items,
            "errors": errors,
            "points_calculated": points_calculated
        }
    else:
        return {
            "status": "partial",
            "message": "Données récupérées mais aucun vainqueur trouvé. Résultats non sauvegardés.",
            "fetched_data": fetched_data,
            "errors": errors
        }

# Avatars endpoints moved to routes/avatars.py + services/avatars.py (S1 lot 3).
# User stats/missions endpoints moved to routes/profile.py + services/profile.py (S1 lot 3).

# Leaderboard endpoints moved to routes/leaderboards.py + services/leaderboards.py (S1 lot 4).

# MINIGAMES routes are in routes/minigames.py.

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

# ==================== SYNC STATUS ENDPOINTS ====================

@api_router.post("/admin/sync-all-pending")
async def sync_all_pending_races(user=Depends(get_current_user)):
    """Manually trigger sync for all races that should have results but don't"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    is_admin = await check_is_admin(user)
    if not user_leagues and not is_admin:
        raise HTTPException(status_code=403, detail="Admin or league creator access required")
    
    now = datetime.now(timezone.utc)
    synced = []
    failed = []
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T18:00:00+00:00")
        
        if now > race_date:
            result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
            has_results = result_doc and result_doc.get("results", {}).get("race_winner")
            
            if not has_results:
                sync_result = await sync_race_from_api(race)
                if sync_result.get("success"):
                    synced.append({"race": race["name"], "winner": sync_result.get("winner")})
                else:
                    failed.append({"race": race["name"], "error": sync_result.get("error")})
    
    return {
        "message": f"Sync completed: {len(synced)} synced, {len(failed)} failed",
        "synced": synced,
        "failed": failed
    }

@api_router.get("/admin/sync-status")
async def get_sync_status(user=Depends(get_current_user)):
    """Get status of auto-sync and pending races"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    is_admin = await check_is_admin(user)
    if not user_leagues and not is_admin:
        raise HTTPException(status_code=403, detail="Admin or league creator access required")
    
    now = datetime.now(timezone.utc)
    races_status = []
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        has_results = result_doc and result_doc.get("results", {}).get("race_winner")
        
        status = "upcoming"
        if has_results:
            status = "synced"
        elif now > race_date:
            status = "pending_sync"
        
        races_status.append({
            "id": race["id"],
            "name": race["name"],
            "date": race["date"],
            "status": status,
            "has_results": has_results,
            "auto_synced": result_doc.get("auto_synced", False) if result_doc else False
        })
    
    return {
        "auto_sync_enabled": True,
        "sync_interval_hours": 1,
        "races": races_status,
        "summary": {
            "synced": len([r for r in races_status if r["status"] == "synced"]),
            "pending": len([r for r in races_status if r["status"] == "pending_sync"]),
            "upcoming": len([r for r in races_status if r["status"] == "upcoming"])
        }
    }

async def sync_race_from_api(race: dict) -> dict:
    """Sync a single race from external APIs"""
    race_id = race["id"]
    race_date = race.get("date", "")
    year = race_date.split("-")[0] if race_date else "2026"
    
    number_to_id = {d["number"]: d["id"] for d in F1_DRIVERS_2026}
    
    fetched_data = {
        "quali_pole": None, "quali_top10": [], "sprint_quali_top10": [],
        "sprint_race_top10": [], "race_winner": None, "race_top10": [],
        "bonus": {"safety_car": None, "dnf_drivers": [], "fastest_lap": None, "first_corner_leader": None}
    }
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Get round number
            schedule_resp = await client.get(f"{JOLPICA_API}/{year}.json")
            round_number = None
            
            if schedule_resp.status_code == 200:
                races_list = schedule_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [])
                circuit_name = race.get("circuit", "").lower()
                race_name = race.get("name", "").lower().replace("grand prix", "").strip()
                
                for r in races_list:
                    r_circuit = r.get("Circuit", {}).get("circuitId", "").lower()
                    r_name = r.get("raceName", "").lower().replace("grand prix", "").strip()
                    if race_date == r.get("date", "") or circuit_name in r_circuit or race_name in r_name:
                        round_number = r.get("round")
                        break
            
            if not round_number:
                return {"success": False, "error": "Round not found"}
            
            # Fetch qualifying
            quali_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/qualifying.json")
            if quali_resp.status_code == 200:
                quali_results = quali_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("QualifyingResults", [])
                if quali_results:
                    pole_num = quali_results[0].get("Driver", {}).get("permanentNumber")
                    if pole_num: fetched_data["quali_pole"] = number_to_id.get(int(pole_num))
                    for result in quali_results[:10]:
                        d_num = result.get("Driver", {}).get("permanentNumber")
                        if d_num and number_to_id.get(int(d_num)):
                            fetched_data["quali_top10"].append(number_to_id.get(int(d_num)))
            
            # Fetch race
            race_resp = await client.get(f"{JOLPICA_API}/{year}/{round_number}/results.json")
            if race_resp.status_code == 200:
                race_results = race_resp.json().get("MRData", {}).get("RaceTable", {}).get("Races", [{}])[0].get("Results", [])
                if race_results:
                    winner_num = race_results[0].get("Driver", {}).get("permanentNumber")
                    if winner_num: fetched_data["race_winner"] = number_to_id.get(int(winner_num))
                    for result in race_results[:10]:
                        d_num = result.get("Driver", {}).get("permanentNumber")
                        if d_num and number_to_id.get(int(d_num)):
                            fetched_data["race_top10"].append(number_to_id.get(int(d_num)))
                    
                    # DNF and fastest lap
                    dnf_statuses = ["Accident", "Collision", "Engine", "Gearbox", "Hydraulics", "Retired", "Mechanical"]
                    for result in race_results:
                        if any(s in result.get("status", "") for s in dnf_statuses):
                            d_num = result.get("Driver", {}).get("permanentNumber")
                            if d_num and number_to_id.get(int(d_num)):
                                fetched_data["bonus"]["dnf_drivers"].append(number_to_id.get(int(d_num)))
                        if result.get("FastestLap", {}).get("rank") == "1":
                            d_num = result.get("Driver", {}).get("permanentNumber")
                            if d_num: fetched_data["bonus"]["fastest_lap"] = number_to_id.get(int(d_num))
        
        # Save if we have a winner
        if fetched_data["race_winner"]:
            await db.race_results.update_one(
                {"race_id": race_id},
                {"$set": {"race_id": race_id, "results": fetched_data, 
                          "entered_at": datetime.now(timezone.utc).isoformat(), "auto_synced": True}},
                upsert=True
            )
            
            # Calculate points and update leaderboard
            predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
            for pred in predictions:
                try:
                    points = calculate_points(pred, fetched_data)
                    
                    # Update user XP
                    await db.users.update_one({"id": pred["user_id"]}, {"$inc": {"xp": points["xp_earned"]}})
                    
                    # Send notification
                    await send_user_notification(pred["user_id"], f"Résultats {race['name']}: +{points['total']} pts!", "results")
                    
                    # Update leaderboard for all leagues the user is in
                    leagues = await db.leagues.find({"members": pred["user_id"]}, {"_id": 0}).to_list(100)
                    for league in leagues:
                        entry = await db.leaderboard.find_one({"league_id": league["id"], "user_id": pred["user_id"]})
                        if entry:
                            all_entries = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
                            all_entries.sort(key=lambda x: x.get("total_points", 0), reverse=True)
                            current_pos = next((i+1 for i, e in enumerate(all_entries) if e["user_id"] == pred["user_id"]), len(all_entries))
                            
                            await db.leaderboard.update_one(
                                {"id": entry["id"]},
                                {"$inc": {"total_points": points["total"]},
                                 "$set": {"last_race_points": points["total"], "previous_position": current_pos}}
                            )
                except Exception as e:
                    pass
            
            # Lock predictions
            await db.predictions.update_many({"race_id": race_id}, {"$set": {"locked": True}})
            
            return {"success": True, "winner": fetched_data["race_winner"]}
        
        return {"success": False, "error": "No winner found"}
    except Exception as e:
        return {"success": False, "error": str(e)}

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

AUTO_SYNC_INTERVAL_HOURS = 1  # Check every hour
auto_sync_task = None

async def auto_sync_race_results():
    """Background task to automatically sync results for completed races"""
    while True:
        try:
            await asyncio.sleep(AUTO_SYNC_INTERVAL_HOURS * 3600)  # Wait 1 hour
            
            now = datetime.now(timezone.utc)
            logger.info(f"[Auto-Sync] Starting automatic results synchronization at {now.isoformat()}")
            
            synced_races = []
            
            for race in F1_RACES_2026:
                race_id = race["id"]
                race_date = datetime.fromisoformat(race["date"] + "T18:00:00+00:00")  # 3 hours after typical race start
                
                # Only sync if race is past and we don't have results yet
                if now > race_date:
                    result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
                    has_results = result_doc and result_doc.get("results", {}).get("race_winner")
                    
                    if not has_results:
                        # Try to sync this race
                        try:
                            sync_result = await sync_race_from_api(race)
                            if sync_result.get("success"):
                                synced_races.append(race["name"])
                                logger.info(f"[Auto-Sync] Successfully synced {race['name']}")
                            else:
                                logger.warning(f"[Auto-Sync] Could not sync {race['name']}: {sync_result.get('error')}")
                        except Exception as e:
                            logger.error(f"[Auto-Sync] Error syncing {race['name']}: {e}")
            
            if synced_races:
                logger.info(f"[Auto-Sync] Completed. Synced races: {', '.join(synced_races)}")
            else:
                logger.info("[Auto-Sync] No new races to sync")
                
        except asyncio.CancelledError:
            logger.info("[Auto-Sync] Background task cancelled")
            break
        except Exception as e:
            logger.error(f"[Auto-Sync] Unexpected error: {e}")
            await asyncio.sleep(300)  # Wait 5 min on error before retry

@app.on_event("startup")
async def startup_event():
    global auto_sync_task
    # Start the auto-sync background task
    auto_sync_task = asyncio.create_task(auto_sync_race_results())
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
