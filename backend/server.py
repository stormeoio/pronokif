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

# Include all extracted route modules
app.include_router(auth_router, prefix="/api")
app.include_router(leagues_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(races_router, prefix="/api")
app.include_router(minigames_router, prefix="/api")

# NOTE: Models are now in models/schemas.py
# NOTE: Auth helpers are now in services/auth.py
# NOTE: F1 data is now in data/f1_data.py


# F1 Data now in data/f1_data.py


# AUTH, LEAGUES, LEAGUE CHAT routes now in routes/auth.py, routes/leagues.py

# ==================== PUBLIC PROFILE ====================

@api_router.get("/users/{user_id}/profile")
async def get_user_public_profile(user_id: str, user=Depends(get_current_user)):
    """Get public profile of a user"""
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0, "email": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user stats
    stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if not stats:
        stats = get_default_user_stats()
    
    # Count individual predictions (not just documents)
    total_predictions = await count_individual_predictions(user_id)
    
    # Count races participated (number of prediction documents)
    races_participated = await db.predictions.count_documents({"user_id": user_id})
    
    # Get leagues in common with the requesting user
    user_leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    target_leagues = await db.leagues.find({"members": user_id}, {"_id": 0}).to_list(100)
    
    user_league_ids = {league["id"] for league in user_leagues}
    common_leagues = []
    
    for league in target_leagues:
        if league["id"] in user_league_ids:
            # Get position in this league
            leaderboard = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
            leaderboard.sort(key=lambda x: x.get("total_points", 0), reverse=True)
            position = next((i + 1 for i, e in enumerate(leaderboard) if e["user_id"] == user_id), None)
            total_points = next((e.get("total_points", 0) for e in leaderboard if e["user_id"] == user_id), 0)
            
            common_leagues.append({
                "id": league["id"],
                "name": league["name"],
                "position": position,
                "total_points": total_points,
                "members_count": len(league["members"])
            })
    
    # Get recent predictions (last 5)
    recent_predictions = await db.predictions.find(
        {"user_id": user_id}, 
        {"_id": 0, "quali_top10": 0, "race_top10": 0, "sprint_quali_top10": 0, "sprint_race_top10": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Map race names
    race_map = {r["id"]: r["name"] for r in F1_RACES_2026}
    for pred in recent_predictions:
        pred["race_name"] = race_map.get(pred["race_id"], pred["race_id"])
    
    # Get minigame best scores
    reaction_best = await db.minigame_scores.find_one(
        {"user_id": user_id, "game_type": "reaction"},
        {"_id": 0},
        sort=[("score", 1)]  # Lower is better for reaction time
    )
    batak_best = await db.minigame_scores.find_one(
        {"user_id": user_id, "game_type": "batak"},
        {"_id": 0},
        sort=[("score", -1)]  # Higher is better for batak
    )
    
    return {
        "id": target_user["id"],
        "username": target_user.get("username", "Anonymous"),
        "avatar_id": target_user.get("avatar_id"),
        "custom_avatar_url": target_user.get("custom_avatar_url"),
        "level": target_user.get("level", 1),
        "xp": target_user.get("xp", 0),
        "created_at": target_user.get("created_at"),
        "stats": {
            "total_predictions": total_predictions,
            "correct_poles": stats.get("correct_poles", 0),
            "correct_winners": stats.get("correct_winners", 0),
            "perfect_top10": stats.get("perfect_top10", 0),
            "races_participated": races_participated
        },
        "leagues": common_leagues,
        "recent_predictions": recent_predictions,
        "minigames": {
            "reaction_best_ms": reaction_best.get("score") if reaction_best else None,
            "batak_best_score": batak_best.get("score") if batak_best else None
        }
    }

# ==================== HELPER: COUNT INDIVIDUAL PREDICTIONS ====================
async def count_individual_predictions(user_id: str) -> int:
    """Count individual prediction elements (not just documents) for a user.
    Returns: Total count of individual predictions (8 max per classic race, 16 max per sprint race)
    """
    predictions = await db.predictions.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total_pronos = 0
    
    for pred in predictions:
        # Classic race predictions
        if pred.get("quali_pole"):
            total_pronos += 1
        if pred.get("quali_top10") and len(pred.get("quali_top10", [])) > 0:
            total_pronos += 1
        if pred.get("race_winner"):
            total_pronos += 1
        if pred.get("race_top10") and len(pred.get("race_top10", [])) > 0:
            total_pronos += 1
        # Bonus bets
        if pred.get("bonus_bets"):
            bb = pred["bonus_bets"]
            if bb.get("safety_car") is not None:
                total_pronos += 1
            if bb.get("dnf_drivers") and len(bb.get("dnf_drivers", [])) > 0:
                total_pronos += 1
            if bb.get("fastest_lap"):
                total_pronos += 1
            if bb.get("first_corner_leader"):
                total_pronos += 1
        # Sprint predictions
        if pred.get("sprint_quali_pole"):
            total_pronos += 1
        if pred.get("sprint_quali_top10") and len(pred.get("sprint_quali_top10", [])) > 0:
            total_pronos += 1
        if pred.get("sprint_race_winner"):
            total_pronos += 1
        if pred.get("sprint_race_top10") and len(pred.get("sprint_race_top10", [])) > 0:
            total_pronos += 1
        # Sprint bonus bets
        if pred.get("sprint_bonus_bets"):
            sbb = pred["sprint_bonus_bets"]
            if sbb.get("safety_car") is not None:
                total_pronos += 1
            if sbb.get("dnf_drivers") and len(sbb.get("dnf_drivers", [])) > 0:
                total_pronos += 1
            if sbb.get("fastest_lap"):
                total_pronos += 1
            if sbb.get("first_corner_leader"):
                total_pronos += 1
    
    return total_pronos


# ==================== ADMIN EMAIL ====================
ADMIN_EMAIL = "catalan.baptiste123@gmail.com"

async def check_is_admin(user: dict) -> bool:
    """Check if user is admin by email"""
    return user.get("email", "").lower() == ADMIN_EMAIL.lower()

# ==================== FEEDBACK SYSTEM ====================

class FeedbackCreate(BaseModel):
    category: str  # bug, suggestion, feedback
    message: str

@api_router.post("/feedback")
async def submit_feedback(data: FeedbackCreate, user=Depends(get_current_user)):
    """Submit feedback to admin"""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    if len(data.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")
    
    if data.category not in ["bug", "suggestion", "feedback"]:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    feedback = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "email": user.get("email"),
        "category": data.category,
        "message": data.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    await db.feedback.insert_one(feedback)
    return {"message": "Feedback submitted successfully", "id": feedback["id"]}

@api_router.get("/admin/feedback")
async def get_all_feedback(user=Depends(get_current_user)):
    """Get all feedback (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    feedback_list = await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return feedback_list

@api_router.put("/admin/feedback/{feedback_id}/read")
async def mark_feedback_read(feedback_id: str, user=Depends(get_current_user)):
    """Mark feedback as read (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Feedback marked as read"}

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

# ==================== NOTIFICATIONS SYSTEM ====================

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # info, update, important

@api_router.post("/admin/notifications")
async def create_notification(data: NotificationCreate, user=Depends(get_current_user)):
    """Create a notification for all users (admin only)"""
    if not await check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not data.title.strip() or not data.message.strip():
        raise HTTPException(status_code=400, detail="Title and message cannot be empty")
    
    if data.type not in ["info", "update", "important"]:
        raise HTTPException(status_code=400, detail="Invalid notification type")
    
    notification = {
        "id": str(uuid.uuid4()),
        "title": data.title.strip(),
        "message": data.message.strip(),
        "type": data.type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.notifications.insert_one(notification)
    
    # Mark all users as having unread notifications
    await db.users.update_many({}, {"$addToSet": {"unread_notifications": notification["id"]}})
    
    return {"message": "Notification sent to all users", "id": notification["id"]}

@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    """Get all notifications for the user"""
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    
    # Get user's unread notifications
    user_doc = await db.users.find_one({"id": user["id"]}, {"unread_notifications": 1})
    unread_ids = set(user_doc.get("unread_notifications", []))
    
    # Add read status to each notification
    for notif in notifications:
        notif["is_read"] = notif["id"] not in unread_ids
    
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_count(user=Depends(get_current_user)):
    """Get count of unread notifications"""
    user_doc = await db.users.find_one({"id": user["id"]}, {"unread_notifications": 1})
    unread_count = len(user_doc.get("unread_notifications", []))
    return {"count": unread_count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    """Mark a notification as read"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"unread_notifications": notification_id}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"unread_notifications": []}}
    )
    return {"message": "All notifications marked as read"}


# RACES, DRIVERS, PREDICTIONS routes now in routes/races.py, routes/predictions.py

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

# ==================== AVATARS ====================

@api_router.get("/avatars")
async def get_available_avatars():
    """Get all available avatars organized by category"""
    return {
        "default": DEFAULT_AVATARS,
        "teams": TEAM_AVATARS,
        "drivers": DRIVER_AVATARS,
        "all": ALL_AVATARS
    }

@api_router.post("/user/avatar")
async def update_user_avatar(data: AvatarUpdate, user=Depends(get_current_user)):
    """Update user's avatar"""
    update_data = {}
    
    if data.avatar_id:
        # Verify avatar exists
        valid_ids = [a["id"] for a in ALL_AVATARS]
        if data.avatar_id not in valid_ids:
            raise HTTPException(status_code=400, detail="Invalid avatar ID")
        update_data["avatar_id"] = data.avatar_id
        update_data["custom_avatar_url"] = None
    elif data.custom_avatar_url:
        update_data["custom_avatar_url"] = data.custom_avatar_url
        update_data["avatar_id"] = None
    else:
        raise HTTPException(status_code=400, detail="Provide avatar_id or custom_avatar_url")
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserResponse(
        id=updated_user["id"], email=updated_user["email"],
        username=updated_user.get("username"), created_at=updated_user["created_at"],
        current_league_id=updated_user.get("current_league_id"),
        xp=updated_user.get("xp", 0), level=updated_user.get("level", 1),
        avatar_id=updated_user.get("avatar_id"), custom_avatar_url=updated_user.get("custom_avatar_url")
    )

@api_router.post("/user/avatar/upload")
async def upload_custom_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload a custom avatar image (base64 encoded, stored in DB for simplicity)"""
    # Read file and convert to base64
    contents = await file.read()
    if len(contents) > 500000:  # 500KB limit
        raise HTTPException(status_code=400, detail="Image too large (max 500KB)")
    
    # Create a data URL
    content_type = file.content_type or "image/jpeg"
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{content_type};base64,{base64_data}"
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"custom_avatar_url": data_url, "avatar_id": None}}
    )
    
    return {"message": "Avatar uploaded", "avatar_url": data_url}

# ==================== USER STATS & MISSIONS ====================

@api_router.get("/user/stats")
async def get_user_stats(user=Depends(get_current_user)):
    """Get user's statistics"""
    stats_doc = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if not stats_doc:
        # Create default stats
        stats_doc = {"user_id": user["id"], **get_default_user_stats()}
        await db.user_stats.insert_one(stats_doc)
    
    return stats_doc

@api_router.get("/user/missions")
async def get_user_missions(user=Depends(get_current_user)):
    """Get user's mission progress"""
    stats_doc = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if not stats_doc:
        stats_doc = get_default_user_stats()
    
    # Get completed missions from DB
    completed_missions = await db.user_missions.find(
        {"user_id": user["id"], "completed": True}, {"_id": 0}
    ).to_list(1000)
    completed_ids = {m["mission_id"] for m in completed_missions}
    
    progress = get_user_mission_progress(stats_doc)
    
    # Mark already claimed missions
    for p in progress:
        p["claimed"] = p["mission_id"] in completed_ids
    
    return {
        "missions": progress,
        "categories": {
            "assiduity": [p for p in progress if p["category"] == "assiduity"],
            "performance": [p for p in progress if p["category"] == "performance"],
            "social": [p for p in progress if p["category"] == "social"],
            "minigames": [p for p in progress if p["category"] == "minigames"]
        }
    }

@api_router.post("/user/missions/{mission_id}/claim")
async def claim_mission_reward(mission_id: str, user=Depends(get_current_user)):
    """Claim XP reward for completed mission"""
    # Find mission
    mission = next((m for m in MISSIONS if m["id"] == mission_id), None)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    # Check if already claimed
    existing = await db.user_missions.find_one(
        {"user_id": user["id"], "mission_id": mission_id, "completed": True}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Mission already claimed")
    
    # Check if mission is actually completed
    stats_doc = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if not stats_doc or stats_doc.get(mission["stat"], 0) < mission["target"]:
        raise HTTPException(status_code=400, detail="Mission not completed")
    
    # Award XP
    xp_reward = mission["xp_reward"]
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    new_xp = user_data.get("xp", 0) + xp_reward
    new_level = get_level_from_xp(new_xp)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"xp": new_xp, "level": new_level}}
    )
    
    # Mark mission as claimed
    await db.user_missions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mission_id": mission_id,
        "completed": True,
        "claimed_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Notification
    await send_user_notification(
        user["id"],
        f"Mission '{mission['name']}' complétée ! +{xp_reward} XP",
        "mission_complete"
    )
    
    level_up = new_level > user_data.get("level", 1)
    if level_up:
        await send_user_notification(user["id"], f"Niveau {new_level} atteint !", "level_up")
    
    return {
        "message": "Mission claimed",
        "xp_earned": xp_reward,
        "new_xp": new_xp,
        "new_level": new_level,
        "level_up": level_up
    }

# ==================== GLOBAL LEADERBOARD ====================

@api_router.get("/leaderboard/global")
async def get_global_leaderboard(limit: int = 100, user=Depends(get_current_user)):
    """Get global leaderboard (all users)"""
    # Get all users with stats
    users = await db.users.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate total points for each user from all leagues
    user_points = []
    for u in users:
        if not u.get("username"):
            continue
        
        # Sum points from all leagues
        leaderboard_entries = await db.leaderboard.find(
            {"user_id": u["id"]}, {"_id": 0}
        ).to_list(100)
        total_points = sum(e.get("total_points", 0) for e in leaderboard_entries)
        
        user_points.append({
            "user_id": u["id"],
            "username": u.get("username", "Anonymous"),
            "avatar_id": u.get("avatar_id"),
            "total_points": total_points,
            "level": u.get("level", 1),
            "xp": u.get("xp", 0)
        })
    
    # Sort by points
    user_points.sort(key=lambda x: (-x["total_points"], -x["xp"]))
    
    # Add positions
    result = []
    for i, entry in enumerate(user_points[:limit]):
        entry["position"] = i + 1
        result.append(GlobalLeaderboardEntry(**entry))
    
    # Find current user's position if not in top
    my_position = next(
        (i + 1 for i, e in enumerate(user_points) if e["user_id"] == user["id"]),
        None
    )
    
    return {
        "leaderboard": result,
        "my_position": my_position,
        "total_players": len(user_points)
    }

@api_router.get("/leaderboard/race/{race_id}")
async def get_race_weekend_leaderboard(race_id: str, league_id: Optional[str] = None, user=Depends(get_current_user)):
    """Get leaderboard for a specific race weekend"""
    # Get all predictions for this race
    query = {"race_id": race_id}
    predictions = await db.predictions.find(query, {"_id": 0}).to_list(10000)
    
    # Get race results
    results = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not results:
        return {"message": "Results not available yet", "leaderboard": []}
    
    # Calculate points for each prediction
    user_race_points = []
    for pred in predictions:
        points = calculate_points(pred, results["results"])
        
        # Get user info
        user_data = await db.users.find_one({"id": pred["user_id"]}, {"_id": 0})
        if not user_data:
            continue
        
        # If league_id specified, filter
        if league_id:
            user_leagues = await db.leagues.find(
                {"id": league_id, "members": pred["user_id"]}, {"_id": 0}
            ).to_list(1)
            if not user_leagues:
                continue
        
        user_race_points.append({
            "user_id": pred["user_id"],
            "username": user_data.get("username", "Anonymous"),
            "avatar_id": user_data.get("avatar_id"),
            "race_points": points["total"]
        })
    
    # Sort by points
    user_race_points.sort(key=lambda x: x["race_points"], reverse=True)
    
    # Add positions
    result = []
    for i, entry in enumerate(user_race_points):
        entry["position"] = i + 1
        result.append(RaceWeekendLeaderboardEntry(**entry))
    
    return {"leaderboard": result, "race_id": race_id}


# MINIGAMES routes now in routes/minigames.py

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

# ==================== DRIVER DETAILS ====================

from drivers_data import get_driver_details, get_all_drivers_detailed, F1_DRIVERS_DETAILED_2026

# Driver photo URLs - Official F1 headshots in race suits
DRIVER_PHOTOS = {
    "norris": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png",
    "piastri": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png",
    "russell": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png",
    "antonelli": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ANDANT01_Andrea_Kimi_Antonelli/andant01.png.transform/1col/image.png",
    "leclerc": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png",
    "hamilton": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png",
    "verstappen": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png",
    "hadjar": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png",
    "sainz": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png",
    "albon": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png",
    "lawson": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png",
    "lindblad": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ARVLIN01_Arvid_Lindblad/arvlin01.png.transform/1col/image.png",
    "alonso": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png",
    "stroll": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png",
    "ocon": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png",
    "bearman": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png",
    "gasly": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png",
    "colapinto": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png",
    "hulkenberg": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png",
    "bortoleto": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png",
    "perez": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png.transform/1col/image.png",
    "bottas": "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/1col/image.png",
}

def generate_driver_facts(driver: dict, next_race: dict = None) -> list:
    """Generate 10 random interesting facts about the driver for the next GP"""
    facts = []
    
    f1_stats = driver.get("palmares", {}).get("f1", {})
    junior = driver.get("palmares", {}).get("junior", [])
    contract = driver.get("contract", {})
    
    # Fact pool - we'll randomly select 10 from these
    all_facts = []
    
    # Career stats facts
    if f1_stats.get("world_championships", 0) > 0:
        all_facts.append({
            "type": "achievement",
            "title": "Champion du Monde",
            "text": f"{driver['first_name']} a remporté {f1_stats['world_championships']} titre(s) mondial(aux) en F1.",
            "icon": "trophy"
        })
    
    if f1_stats.get("wins", 0) > 0:
        all_facts.append({
            "type": "stat",
            "title": "Victoires en F1",
            "text": f"Total de {f1_stats['wins']} victoire(s) en Grand Prix.",
            "icon": "flag"
        })
    
    if f1_stats.get("podiums", 0) > 0:
        all_facts.append({
            "type": "stat",
            "title": "Podiums",
            "text": f"{f1_stats['podiums']} podium(s) au total dans sa carrière F1.",
            "icon": "medal"
        })
    
    if f1_stats.get("poles", 0) > 0:
        all_facts.append({
            "type": "stat",
            "title": "Pole Positions",
            "text": f"{f1_stats['poles']} pole position(s) en qualifications.",
            "icon": "zap"
        })
    
    if f1_stats.get("fastest_laps", 0) > 0:
        all_facts.append({
            "type": "stat",
            "title": "Meilleurs Tours",
            "text": f"{f1_stats['fastest_laps']} meilleur(s) tour(s) en course.",
            "icon": "timer"
        })
    
    # Junior career facts
    for junior_season in junior[:3]:
        if junior_season.get("position") == 1:
            all_facts.append({
                "type": "junior",
                "title": f"Champion {junior_season['series']}",
                "text": f"Champion de {junior_season['series']} en {junior_season['year']} avec {junior_season.get('team', 'N/A')}.",
                "icon": "award"
            })
    
    # Contract facts
    if contract.get("end_year"):
        years_left = contract["end_year"] - 2026
        if years_left > 0:
            all_facts.append({
                "type": "contract",
                "title": "Contrat actuel",
                "text": f"Sous contrat avec {driver['team']} jusqu'en {contract['end_year']} ({years_left} an(s) restant(s)).",
                "icon": "file"
            })
    
    if contract.get("salary_estimate"):
        all_facts.append({
            "type": "contract",
            "title": "Salaire estimé",
            "text": f"Rémunération estimée : {contract['salary_estimate']}.",
            "icon": "dollar"
        })
    
    # Personal facts
    age = 2026 - int(driver.get("date_of_birth", "2000-01-01").split("-")[0])
    all_facts.append({
        "type": "personal",
        "title": "Âge",
        "text": f"{driver['first_name']} a {age} ans (né le {driver.get('date_of_birth', 'N/A')}).",
        "icon": "calendar"
    })
    
    all_facts.append({
        "type": "personal",
        "title": "Nationalité",
        "text": f"Représente {driver.get('country_name', driver.get('country', 'N/A'))} en Formule 1.",
        "icon": "flag"
    })
    
    all_facts.append({
        "type": "personal",
        "title": "Lieu de naissance",
        "text": f"Né à {driver.get('place_of_birth', 'N/A')}.",
        "icon": "map"
    })
    
    if driver.get("height_cm"):
        all_facts.append({
            "type": "physical",
            "title": "Taille",
            "text": f"Mesure {driver['height_cm']} cm.",
            "icon": "ruler"
        })
    
    # Team facts
    all_facts.append({
        "type": "team",
        "title": "Équipe actuelle",
        "text": f"Pilote pour {driver['team']} avec le numéro {driver.get('number', 'N/A')}.",
        "icon": "car"
    })
    
    if f1_stats.get("first_team"):
        all_facts.append({
            "type": "career",
            "title": "Débuts en F1",
            "text": f"A débuté en F1 avec {f1_stats['first_team']} ({f1_stats.get('seasons', 'N/A')}).",
            "icon": "play"
        })
    
    # Experience facts
    if f1_stats.get("entries", 0) > 0:
        all_facts.append({
            "type": "experience",
            "title": "Expérience",
            "text": f"{f1_stats['entries']} Grand(s) Prix disputé(s) en carrière.",
            "icon": "target"
        })
    
    # Points facts
    if f1_stats.get("points", 0) > 0:
        all_facts.append({
            "type": "stat",
            "title": "Points en carrière",
            "text": f"Total de {f1_stats['points']} points marqués en F1.",
            "icon": "hash"
        })
    
    # License points
    if driver.get("license_points"):
        all_facts.append({
            "type": "misc",
            "title": "Points de permis",
            "text": f"Actuellement {driver['license_points']}/12 points sur sa super-licence.",
            "icon": "shield"
        })
    
    # Contract notes
    if contract.get("notes"):
        all_facts.append({
            "type": "info",
            "title": "Info contrat",
            "text": contract["notes"],
            "icon": "info"
        })
    
    # Randomly select 10 facts (or all if less than 10)
    random.shuffle(all_facts)
    return all_facts[:10]

@api_router.get("/drivers/{driver_id}/details")
async def get_driver_detail_endpoint(driver_id: str):
    """Get detailed information about a specific driver"""
    driver = get_driver_details(driver_id)
    
    if not driver:
        # Try to find by code (VER, HAM, etc.)
        for d in F1_DRIVERS_DETAILED_2026.values():
            if d.get("code", "").lower() == driver_id.lower():
                driver = d
                break
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Add photo URL
    driver["photo_url"] = DRIVER_PHOTOS.get(driver["id"], DRIVER_PHOTOS.get("norris"))
    
    # Get next race for context
    next_race = await db.races.find_one(
        {"status": {"$in": ["upcoming", "active"]}},
        {"_id": 0},
        sort=[("date", 1)]
    )
    
    # Generate interesting facts
    driver["useful_facts"] = generate_driver_facts(driver, next_race)
    
    return driver

@api_router.get("/drivers/all")
async def get_all_drivers_endpoint():
    """Get all drivers with basic info"""
    drivers = get_all_drivers_detailed()
    # Add photo URLs
    for driver in drivers:
        driver["photo_url"] = DRIVER_PHOTOS.get(driver["id"], DRIVER_PHOTOS.get("norris"))
    return drivers

@api_router.get("/drivers/compare")
async def compare_drivers(driver1: str, driver2: str):
    """Compare two drivers side by side"""
    d1 = get_driver_details(driver1)
    d2 = get_driver_details(driver2)
    
    if not d1 or not d2:
        raise HTTPException(status_code=404, detail="One or both drivers not found")
    
    # Add photo URLs
    d1["photo_url"] = DRIVER_PHOTOS.get(d1["id"], DRIVER_PHOTOS.get("norris"))
    d2["photo_url"] = DRIVER_PHOTOS.get(d2["id"], DRIVER_PHOTOS.get("norris"))
    
    # Get F1 stats for comparison
    d1_f1 = d1.get("palmares", {}).get("f1", {})
    d2_f1 = d2.get("palmares", {}).get("f1", {})
    
    # Calculate comparison metrics
    comparison = {
        "driver1": d1,
        "driver2": d2,
        "stats_comparison": {
            "world_championships": {
                "driver1": d1_f1.get("world_championships", 0),
                "driver2": d2_f1.get("world_championships", 0),
                "winner": "driver1" if d1_f1.get("world_championships", 0) > d2_f1.get("world_championships", 0) else "driver2" if d2_f1.get("world_championships", 0) > d1_f1.get("world_championships", 0) else "tie"
            },
            "wins": {
                "driver1": d1_f1.get("wins", 0),
                "driver2": d2_f1.get("wins", 0),
                "winner": "driver1" if d1_f1.get("wins", 0) > d2_f1.get("wins", 0) else "driver2" if d2_f1.get("wins", 0) > d1_f1.get("wins", 0) else "tie"
            },
            "podiums": {
                "driver1": d1_f1.get("podiums", 0),
                "driver2": d2_f1.get("podiums", 0),
                "winner": "driver1" if d1_f1.get("podiums", 0) > d2_f1.get("podiums", 0) else "driver2" if d2_f1.get("podiums", 0) > d1_f1.get("podiums", 0) else "tie"
            },
            "poles": {
                "driver1": d1_f1.get("poles", 0),
                "driver2": d2_f1.get("poles", 0),
                "winner": "driver1" if d1_f1.get("poles", 0) > d2_f1.get("poles", 0) else "driver2" if d2_f1.get("poles", 0) > d1_f1.get("poles", 0) else "tie"
            },
            "fastest_laps": {
                "driver1": d1_f1.get("fastest_laps", 0),
                "driver2": d2_f1.get("fastest_laps", 0),
                "winner": "driver1" if d1_f1.get("fastest_laps", 0) > d2_f1.get("fastest_laps", 0) else "driver2" if d2_f1.get("fastest_laps", 0) > d1_f1.get("fastest_laps", 0) else "tie"
            },
            "points": {
                "driver1": d1_f1.get("points", 0),
                "driver2": d2_f1.get("points", 0),
                "winner": "driver1" if d1_f1.get("points", 0) > d2_f1.get("points", 0) else "driver2" if d2_f1.get("points", 0) > d1_f1.get("points", 0) else "tie"
            },
            "entries": {
                "driver1": d1_f1.get("entries", 0),
                "driver2": d2_f1.get("entries", 0),
                "winner": "driver1" if d1_f1.get("entries", 0) > d2_f1.get("entries", 0) else "driver2" if d2_f1.get("entries", 0) > d1_f1.get("entries", 0) else "tie"
            }
        },
        "win_rate": {
            "driver1": round((d1_f1.get("wins", 0) / max(d1_f1.get("entries", 1), 1)) * 100, 1),
            "driver2": round((d2_f1.get("wins", 0) / max(d2_f1.get("entries", 1), 1)) * 100, 1)
        },
        "podium_rate": {
            "driver1": round((d1_f1.get("podiums", 0) / max(d1_f1.get("entries", 1), 1)) * 100, 1),
            "driver2": round((d2_f1.get("podiums", 0) / max(d2_f1.get("entries", 1), 1)) * 100, 1)
        },
        "pole_rate": {
            "driver1": round((d1_f1.get("poles", 0) / max(d1_f1.get("entries", 1), 1)) * 100, 1),
            "driver2": round((d2_f1.get("poles", 0) / max(d2_f1.get("entries", 1), 1)) * 100, 1)
        },
        "points_per_race": {
            "driver1": round(d1_f1.get("points", 0) / max(d1_f1.get("entries", 1), 1), 2),
            "driver2": round(d2_f1.get("points", 0) / max(d2_f1.get("entries", 1), 1), 2)
        }
    }
    
    return comparison

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
