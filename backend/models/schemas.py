"""
PRONOKIF - Pydantic Models/Schemas
All request/response models for the API
"""

from typing import Any

from pydantic import BaseModel, EmailStr

# ==================== AUTH MODELS ====================


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class UserSetUsername(BaseModel):
    username: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str | None = None
    created_at: str
    current_league_id: str | None = None
    xp: int = 0
    level: int = 1
    avatar_id: str | None = None
    custom_avatar_url: str | None = None
    email_verified: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================== LEAGUE MODELS ====================


class LeagueCreate(BaseModel):
    name: str
    description: str | None = None


class LeagueJoin(BaseModel):
    code: str


class LeagueUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class LeagueResponse(BaseModel):
    id: str
    name: str
    code: str
    created_by: str
    members: list[str]
    created_at: str
    description: str | None = None


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
    dnf_drivers: list[str] = []
    fastest_lap_driver: str | None = None
    first_corner_leader: str | None = None


class SprintPredictionCreate(BaseModel):
    race_id: str
    sprint_quali_pole: str
    sprint_quali_top10: list[str]
    sprint_race_winner: str
    sprint_race_top10: list[str]
    sprint_bonus_bets: BonusBets | None = None


class MainPredictionCreate(BaseModel):
    race_id: str
    quali_pole: str
    quali_top10: list[str]
    race_winner: str
    race_top10: list[str]
    bonus_bets: BonusBets | None = None


class PredictionCreate(BaseModel):
    race_id: str
    quali_pole: str
    quali_top10: list[str]
    sprint_quali_pole: str | None = None
    sprint_quali_top10: list[str] | None = None
    sprint_race_winner: str | None = None
    sprint_race_top10: list[str] | None = None
    race_winner: str
    race_top10: list[str]
    bonus_bets: BonusBets | None = None
    sprint_bonus_bets: BonusBets | None = None
    custom_predictions: dict[str, Any] | None = None


class PredictionResponse(BaseModel):
    id: str
    user_id: str
    race_id: str
    quali_pole: str
    quali_top10: list[str]
    sprint_quali_top10: list[str] | None = None
    sprint_race_top10: list[str] | None = None
    race_winner: str
    race_top10: list[str]
    bonus_bets: dict | None = None
    custom_predictions: dict | None = None
    locked: bool
    created_at: str
    updated_at: str


# ==================== CUSTOM PREDICTION MODELS ====================


class CustomPredictionChoice(BaseModel):
    id: str | None = None
    text: str
    driver_id: str | None = None
    position: int | None = None
    points: int = 2


class CustomPredictionCreate(BaseModel):
    race_id: str
    league_id: str
    question: str
    answer_type: str  # "text", "drivers", "positions", "custom"
    multiple_choice: bool = False
    choices: list[CustomPredictionChoice] | None = None


class CustomPredictionAnswer(BaseModel):
    answer: Any  # str, list[str], bool depending on answer_type


class SetCorrectAnswer(BaseModel):
    correct_answer: Any  # str, list[str], bool depending on answer_type


class CustomPredictionResponse(BaseModel):
    id: str
    race_id: str
    league_id: str
    created_by: str
    question: str
    answer_type: str
    multiple_choice: bool
    choices: list[dict] | None = None
    correct_answer: Any | None = None
    created_at: str


# ==================== RACE & DRIVER MODELS ====================


class RaceResponse(BaseModel):
    id: str
    name: str
    circuit: str
    country: str
    date: str
    quali_date: str
    sprint_quali_date: str | None = None
    sprint_race_date: str | None = None
    predictions_close_at: str
    status: str
    is_sprint_weekend: bool = False
    results: dict | None = None
    race_time: str | None = None
    quali_time: str | None = None
    sprint_quali_time: str | None = None
    sprint_race_time: str | None = None
    timezone: str | None = "Europe/Paris"
    race_start_at: str | None = None
    race_end_at: str | None = None
    race_duration_minutes: int | None = None
    is_test_race: bool = False
    thumbnail_url: str | None = None
    is_cancelled: bool = False


class DriverResponse(BaseModel):
    id: str
    name: str
    team: str
    number: int
    country: str
    code: str | None = None


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
    quali_top10: list[str]
    sprint_quali_top10: list[str] | None = None
    sprint_race_top10: list[str] | None = None
    race_winner: str
    race_top10: list[str]
    safety_car: bool = False
    dnf_drivers: list[str] = []
    fastest_lap: str | None = None
    first_corner_leader: str | None = None
