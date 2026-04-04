"""
PRONOKIF - Pydantic Models/Schemas
All request/response models for the API
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


# ==================== AUTH MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserSetUsername(BaseModel):
    username: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    created_at: str
    current_league_id: Optional[str] = None
    xp: int = 0
    level: int = 1
    avatar_id: Optional[str] = None
    custom_avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================== LEAGUE MODELS ====================

class LeagueCreate(BaseModel):
    name: str
    description: Optional[str] = None


class LeagueJoin(BaseModel):
    code: str


class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class LeagueResponse(BaseModel):
    id: str
    name: str
    code: str
    created_by: str
    members: List[str]
    created_at: str
    description: Optional[str] = None


class TransferOwnershipRequest(BaseModel):
    new_owner_id: str


class ChatMessage(BaseModel):
    content: str


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_points: int
    last_race_points: int
    position: int
    position_change: int


# ==================== PREDICTION MODELS ====================

class BonusBets(BaseModel):
    safety_car: bool = False
    dnf_drivers: List[str] = []
    fastest_lap_driver: Optional[str] = None
    first_corner_leader: Optional[str] = None


class SprintPredictionCreate(BaseModel):
    race_id: str
    sprint_quali_pole: str
    sprint_quali_top10: List[str]
    sprint_race_winner: str
    sprint_race_top10: List[str]
    sprint_bonus_bets: Optional[BonusBets] = None


class MainPredictionCreate(BaseModel):
    race_id: str
    quali_pole: str
    quali_top10: List[str]
    race_winner: str
    race_top10: List[str]
    bonus_bets: Optional[BonusBets] = None


class PredictionCreate(BaseModel):
    race_id: str
    quali_pole: str
    quali_top10: List[str]
    sprint_quali_pole: Optional[str] = None
    sprint_quali_top10: Optional[List[str]] = None
    sprint_race_winner: Optional[str] = None
    sprint_race_top10: Optional[List[str]] = None
    race_winner: str
    race_top10: List[str]
    bonus_bets: Optional[BonusBets] = None
    sprint_bonus_bets: Optional[BonusBets] = None
    custom_predictions: Optional[Dict[str, Any]] = None


class PredictionResponse(BaseModel):
    id: str
    user_id: str
    race_id: str
    quali_pole: str
    quali_top10: List[str]
    sprint_quali_top10: Optional[List[str]] = None
    sprint_race_top10: Optional[List[str]] = None
    race_winner: str
    race_top10: List[str]
    bonus_bets: Optional[dict] = None
    custom_predictions: Optional[dict] = None
    locked: bool
    created_at: str
    updated_at: str


# ==================== CUSTOM PREDICTION MODELS ====================

class CustomPredictionChoice(BaseModel):
    id: Optional[str] = None
    text: str
    driver_id: Optional[str] = None
    position: Optional[int] = None
    points: int = 2


class CustomPredictionCreate(BaseModel):
    race_id: str
    league_id: str
    question: str
    answer_type: str  # "text", "drivers", "positions", "custom"
    multiple_choice: bool = False
    choices: Optional[List[CustomPredictionChoice]] = None


class CustomPredictionResponse(BaseModel):
    id: str
    race_id: str
    league_id: str
    created_by: str
    question: str
    answer_type: str
    multiple_choice: bool
    choices: Optional[List[dict]] = None
    correct_answer: Optional[Any] = None
    created_at: str


# ==================== RACE & DRIVER MODELS ====================

class RaceResponse(BaseModel):
    id: str
    name: str
    circuit: str
    country: str
    date: str
    quali_date: str
    sprint_quali_date: Optional[str] = None
    sprint_race_date: Optional[str] = None
    predictions_close_at: str
    status: str
    is_sprint_weekend: bool = False
    results: Optional[dict] = None
    race_time: Optional[str] = None
    quali_time: Optional[str] = None
    sprint_quali_time: Optional[str] = None
    sprint_race_time: Optional[str] = None
    timezone: Optional[str] = "Europe/Paris"


class DriverResponse(BaseModel):
    id: str
    name: str
    team: str
    number: int
    country: str
    code: Optional[str] = None


# ==================== NOTIFICATION & FEEDBACK MODELS ====================

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    read: bool
    created_at: str


class FeedbackCreate(BaseModel):
    type: str  # "bug", "suggestion", "other"
    message: str


# ==================== ADMIN MODELS ====================

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
