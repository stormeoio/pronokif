from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'pronokif-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

security = HTTPBearer()

# OpenF1 API Base URL
OPENF1_API = "https://api.openf1.org/v1"
# Jolpica F1 API (Ergast successor) - for official results
JOLPICA_API = "https://api.jolpi.ca/ergast/f1"

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

# ==================== MODELS ====================

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

# Extended prediction models for Top 10 + Sprint
class BonusBets(BaseModel):
    safety_car: bool = False
    dnf_drivers: List[str] = []  # Changed from bool to list of driver IDs
    fastest_lap_driver: Optional[str] = None
    first_corner_leader: Optional[str] = None  # NEW: Leader after first corner

# Separate prediction models for Sprint and Main race
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
    # Qualifications Race (Top 10)
    quali_pole: str
    quali_top10: List[str]  # Extended to Top 10
    # Sprint Qualifications - only for sprint weekends
    sprint_quali_pole: Optional[str] = None
    sprint_quali_top10: Optional[List[str]] = None
    # Sprint Race - only for sprint weekends
    sprint_race_winner: Optional[str] = None
    sprint_race_top10: Optional[List[str]] = None
    # Main Race (Top 10)
    race_winner: str
    race_top10: List[str]  # Extended to Top 10
    # Bonus bets
    bonus_bets: Optional[BonusBets] = None
    sprint_bonus_bets: Optional[BonusBets] = None
    # Custom predictions answers
    custom_predictions: Optional[Dict[str, Any]] = None  # {prediction_id: answer}

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

# Custom Prediction Models
class CustomPredictionChoice(BaseModel):
    id: Optional[str] = None
    text: str
    driver_id: Optional[str] = None  # If it's a driver choice
    position: Optional[int] = None   # If it's a position choice
    points: int = 2  # Points awarded for this choice

class CustomPredictionCreate(BaseModel):
    race_id: str
    league_id: str
    question: str
    answer_type: str  # "text", "drivers", "positions", "custom"
    multiple_choice: bool = False  # Single or multiple answers allowed
    choices: Optional[List[CustomPredictionChoice]] = None  # For custom choices

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

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_points: int
    last_race_points: int
    position: int
    position_change: int

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

class DriverResponse(BaseModel):
    id: str
    name: str
    team: str
    number: int
    country: str
    code: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    message: str
    type: str
    read: bool
    created_at: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expiration, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

# ==================== F1 DATA ====================

F1_DRIVERS_2026 = [
    {"id": "norris", "name": "Lando Norris", "team": "McLaren", "number": 1, "country": "GBR", "code": "NOR"},
    {"id": "piastri", "name": "Oscar Piastri", "team": "McLaren", "number": 81, "country": "AUS", "code": "PIA"},
    {"id": "russell", "name": "George Russell", "team": "Mercedes", "number": 63, "country": "GBR", "code": "RUS"},
    {"id": "antonelli", "name": "Kimi Antonelli", "team": "Mercedes", "number": 12, "country": "ITA", "code": "ANT"},
    {"id": "leclerc", "name": "Charles Leclerc", "team": "Ferrari", "number": 16, "country": "MON", "code": "LEC"},
    {"id": "hamilton", "name": "Lewis Hamilton", "team": "Ferrari", "number": 44, "country": "GBR", "code": "HAM"},
    {"id": "verstappen", "name": "Max Verstappen", "team": "Red Bull Racing", "number": 3, "country": "NED", "code": "VER"},
    {"id": "hadjar", "name": "Isack Hadjar", "team": "Red Bull Racing", "number": 6, "country": "FRA", "code": "HAD"},
    {"id": "sainz", "name": "Carlos Sainz", "team": "Williams", "number": 55, "country": "ESP", "code": "SAI"},
    {"id": "albon", "name": "Alexander Albon", "team": "Williams", "number": 23, "country": "THA", "code": "ALB"},
    {"id": "lawson", "name": "Liam Lawson", "team": "Racing Bulls", "number": 30, "country": "NZL", "code": "LAW"},
    {"id": "lindblad", "name": "Arvid Lindblad", "team": "Racing Bulls", "number": 41, "country": "GBR", "code": "LIN"},
    {"id": "alonso", "name": "Fernando Alonso", "team": "Aston Martin", "number": 14, "country": "ESP", "code": "ALO"},
    {"id": "stroll", "name": "Lance Stroll", "team": "Aston Martin", "number": 18, "country": "CAN", "code": "STR"},
    {"id": "ocon", "name": "Esteban Ocon", "team": "Haas", "number": 31, "country": "FRA", "code": "OCO"},
    {"id": "bearman", "name": "Oliver Bearman", "team": "Haas", "number": 87, "country": "GBR", "code": "BEA"},
    {"id": "gasly", "name": "Pierre Gasly", "team": "Alpine", "number": 10, "country": "FRA", "code": "GAS"},
    {"id": "colapinto", "name": "Franco Colapinto", "team": "Alpine", "number": 43, "country": "ARG", "code": "COL"},
    {"id": "hulkenberg", "name": "Nico Hülkenberg", "team": "Audi", "number": 27, "country": "GER", "code": "HUL"},
    {"id": "bortoleto", "name": "Gabriel Bortoleto", "team": "Audi", "number": 5, "country": "BRA", "code": "BOR"},
    {"id": "perez", "name": "Sergio Pérez", "team": "Cadillac", "number": 11, "country": "MEX", "code": "PER"},
    {"id": "bottas", "name": "Valtteri Bottas", "team": "Cadillac", "number": 77, "country": "FIN", "code": "BOT"},
]

# F1 Circuit Details (length, turns, layout images)
F1_CIRCUITS = {
    "Albert Park": {"full_name": "Albert Park Circuit", "length_km": 5.278, "turns": 14, "laps": 58},
    "Shanghai": {"full_name": "Shanghai International Circuit", "length_km": 5.451, "turns": 16, "laps": 56},
    "Suzuka": {"full_name": "Suzuka International Racing Course", "length_km": 5.807, "turns": 18, "laps": 53},
    "Sakhir": {"full_name": "Bahrain International Circuit", "length_km": 5.412, "turns": 15, "laps": 57},
    "Jeddah": {"full_name": "Jeddah Corniche Circuit", "length_km": 6.174, "turns": 27, "laps": 50},
    "Miami": {"full_name": "Miami International Autodrome", "length_km": 5.412, "turns": 19, "laps": 57},
    "Imola": {"full_name": "Autodromo Enzo e Dino Ferrari", "length_km": 4.909, "turns": 19, "laps": 63},
    "Monaco": {"full_name": "Circuit de Monaco", "length_km": 3.337, "turns": 19, "laps": 78},
    "Barcelona": {"full_name": "Circuit de Barcelona-Catalunya", "length_km": 4.657, "turns": 16, "laps": 66},
    "Montreal": {"full_name": "Circuit Gilles Villeneuve", "length_km": 4.361, "turns": 14, "laps": 70},
    "Red Bull Ring": {"full_name": "Red Bull Ring", "length_km": 4.318, "turns": 10, "laps": 71},
    "Silverstone": {"full_name": "Silverstone Circuit", "length_km": 5.891, "turns": 18, "laps": 52},
    "Spa-Francorchamps": {"full_name": "Circuit de Spa-Francorchamps", "length_km": 7.004, "turns": 19, "laps": 44},
    "Hungaroring": {"full_name": "Hungaroring", "length_km": 4.381, "turns": 14, "laps": 70},
    "Zandvoort": {"full_name": "Circuit Zandvoort", "length_km": 4.259, "turns": 14, "laps": 72},
    "Monza": {"full_name": "Autodromo Nazionale Monza", "length_km": 5.793, "turns": 11, "laps": 53},
    "Madrid": {"full_name": "Circuito de Madrid", "length_km": 5.474, "turns": 16, "laps": 56},
    "Baku": {"full_name": "Baku City Circuit", "length_km": 6.003, "turns": 20, "laps": 51},
    "Marina Bay": {"full_name": "Marina Bay Street Circuit", "length_km": 4.940, "turns": 19, "laps": 62},
    "COTA": {"full_name": "Circuit of the Americas", "length_km": 5.513, "turns": 20, "laps": 56},
    "Hermanos Rodríguez": {"full_name": "Autódromo Hermanos Rodríguez", "length_km": 4.304, "turns": 17, "laps": 71},
    "Interlagos": {"full_name": "Autódromo José Carlos Pace", "length_km": 4.309, "turns": 15, "laps": 71},
    "Las Vegas": {"full_name": "Las Vegas Street Circuit", "length_km": 6.201, "turns": 17, "laps": 50},
    "Lusail": {"full_name": "Lusail International Circuit", "length_km": 5.380, "turns": 16, "laps": 57},
    "Yas Marina": {"full_name": "Yas Marina Circuit", "length_km": 5.281, "turns": 16, "laps": 58},
}

# F1 2026 Calendar with Sprint weekends marked, FP1 times and full session schedule
F1_RACES_2026 = [
    {"id": "australia-2026", "name": "Australian Grand Prix", "circuit": "Albert Park", "country": "Australia", 
     "date": "2026-03-08", "quali_date": "2026-03-07", "fp1_date": "2026-03-06", "fp1_time": "01:30", 
     "fp2_date": "2026-03-06", "fp2_time": "05:00", "fp3_date": "2026-03-07", "fp3_time": "01:30",
     "quali_time": "05:00", "race_time": "04:00", "is_sprint": False},
    {"id": "china-2026", "name": "Chinese Grand Prix", "circuit": "Shanghai", "country": "China", 
     "date": "2026-03-15", "quali_date": "2026-03-13", "fp1_date": "2026-03-13", "fp1_time": "03:30", 
     "sprint_quali_date": "2026-03-13", "sprint_quali_time": "07:30",
     "sprint_race_date": "2026-03-14", "sprint_race_time": "03:00",
     "quali_time": "07:00", "race_time": "07:00", "is_sprint": True},
    {"id": "japan-2026", "name": "Japanese Grand Prix", "circuit": "Suzuka", "country": "Japan", 
     "date": "2026-03-29", "quali_date": "2026-03-28", "fp1_date": "2026-03-27", "fp1_time": "02:30", 
     "fp2_date": "2026-03-27", "fp2_time": "06:00", "fp3_date": "2026-03-28", "fp3_time": "02:30",
     "quali_time": "06:00", "race_time": "05:00", "is_sprint": False},
    {"id": "bahrain-2026", "name": "Bahrain Grand Prix", "circuit": "Sakhir", "country": "Bahrain", 
     "date": "2026-04-05", "quali_date": "2026-04-04", "fp1_date": "2026-04-03", "fp1_time": "11:30", 
     "fp2_date": "2026-04-03", "fp2_time": "15:00", "fp3_date": "2026-04-04", "fp3_time": "12:30",
     "quali_time": "16:00", "race_time": "15:00", "is_sprint": False},
    {"id": "saudi-2026", "name": "Saudi Arabian Grand Prix", "circuit": "Jeddah", "country": "Saudi Arabia", 
     "date": "2026-04-19", "quali_date": "2026-04-18", "fp1_date": "2026-04-17", "fp1_time": "13:30", 
     "fp2_date": "2026-04-17", "fp2_time": "17:00", "fp3_date": "2026-04-18", "fp3_time": "13:30",
     "quali_time": "17:00", "race_time": "17:00", "is_sprint": False},
    {"id": "miami-2026", "name": "Miami Grand Prix", "circuit": "Miami", "country": "USA", 
     "date": "2026-05-03", "quali_date": "2026-05-01", "fp1_date": "2026-05-01", "fp1_time": "18:30", 
     "sprint_quali_date": "2026-05-01", "sprint_quali_time": "22:30",
     "sprint_race_date": "2026-05-02", "sprint_race_time": "16:00",
     "quali_time": "20:00", "race_time": "20:00", "is_sprint": True},
    {"id": "emilia-2026", "name": "Emilia Romagna Grand Prix", "circuit": "Imola", "country": "Italy", 
     "date": "2026-05-17", "quali_date": "2026-05-16", "fp1_date": "2026-05-15", "fp1_time": "11:30", 
     "fp2_date": "2026-05-15", "fp2_time": "15:00", "fp3_date": "2026-05-16", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "monaco-2026", "name": "Monaco Grand Prix", "circuit": "Monaco", "country": "Monaco", 
     "date": "2026-05-24", "quali_date": "2026-05-23", "fp1_date": "2026-05-22", "fp1_time": "11:30", 
     "fp2_date": "2026-05-22", "fp2_time": "15:00", "fp3_date": "2026-05-23", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "spain-2026", "name": "Spanish Grand Prix", "circuit": "Barcelona", "country": "Spain", 
     "date": "2026-06-07", "quali_date": "2026-06-06", "fp1_date": "2026-06-05", "fp1_time": "11:30", 
     "fp2_date": "2026-06-05", "fp2_time": "15:00", "fp3_date": "2026-06-06", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "canada-2026", "name": "Canadian Grand Prix", "circuit": "Montreal", "country": "Canada", 
     "date": "2026-06-21", "quali_date": "2026-06-20", "fp1_date": "2026-06-19", "fp1_time": "17:30", 
     "fp2_date": "2026-06-19", "fp2_time": "21:00", "fp3_date": "2026-06-20", "fp3_time": "16:30",
     "quali_time": "20:00", "race_time": "18:00", "is_sprint": False},
    {"id": "austria-2026", "name": "Austrian Grand Prix", "circuit": "Red Bull Ring", "country": "Austria", 
     "date": "2026-07-05", "quali_date": "2026-07-03", "fp1_date": "2026-07-03", "fp1_time": "10:30", 
     "sprint_quali_date": "2026-07-03", "sprint_quali_time": "14:30",
     "sprint_race_date": "2026-07-04", "sprint_race_time": "10:00",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": True},
    {"id": "silverstone-2026", "name": "British Grand Prix", "circuit": "Silverstone", "country": "UK", 
     "date": "2026-07-19", "quali_date": "2026-07-18", "fp1_date": "2026-07-17", "fp1_time": "11:30", 
     "fp2_date": "2026-07-17", "fp2_time": "15:00", "fp3_date": "2026-07-18", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "14:00", "is_sprint": False},
    {"id": "belgium-2026", "name": "Belgian Grand Prix", "circuit": "Spa-Francorchamps", "country": "Belgium", 
     "date": "2026-08-02", "quali_date": "2026-08-01", "fp1_date": "2026-07-31", "fp1_time": "11:30", 
     "fp2_date": "2026-07-31", "fp2_time": "15:00", "fp3_date": "2026-08-01", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "hungary-2026", "name": "Hungarian Grand Prix", "circuit": "Hungaroring", "country": "Hungary", 
     "date": "2026-08-16", "quali_date": "2026-08-15", "fp1_date": "2026-08-14", "fp1_time": "11:30", 
     "fp2_date": "2026-08-14", "fp2_time": "15:00", "fp3_date": "2026-08-15", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "netherlands-2026", "name": "Dutch Grand Prix", "circuit": "Zandvoort", "country": "Netherlands", 
     "date": "2026-08-30", "quali_date": "2026-08-29", "fp1_date": "2026-08-28", "fp1_time": "10:30", 
     "fp2_date": "2026-08-28", "fp2_time": "14:00", "fp3_date": "2026-08-29", "fp3_time": "09:30",
     "quali_time": "13:00", "race_time": "13:00", "is_sprint": False},
    {"id": "monza-2026", "name": "Italian Grand Prix", "circuit": "Monza", "country": "Italy", 
     "date": "2026-09-06", "quali_date": "2026-09-05", "fp1_date": "2026-09-04", "fp1_time": "11:30", 
     "fp2_date": "2026-09-04", "fp2_time": "15:00", "fp3_date": "2026-09-05", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
    {"id": "madrid-2026", "name": "Madrid Grand Prix", "circuit": "Madrid", "country": "Spain", 
     "date": "2026-09-13", "quali_date": "2026-09-12", "fp1_date": "2026-09-11", "fp1_time": "12:30", 
     "fp2_date": "2026-09-11", "fp2_time": "16:00", "fp3_date": "2026-09-12", "fp3_time": "11:30",
     "quali_time": "15:00", "race_time": "14:00", "is_sprint": False},
    {"id": "azerbaijan-2026", "name": "Azerbaijan Grand Prix", "circuit": "Baku", "country": "Azerbaijan", 
     "date": "2026-09-20", "quali_date": "2026-09-19", "fp1_date": "2026-09-18", "fp1_time": "09:30", 
     "fp2_date": "2026-09-18", "fp2_time": "13:00", "fp3_date": "2026-09-19", "fp3_time": "08:30",
     "quali_time": "12:00", "race_time": "11:00", "is_sprint": False},
    {"id": "singapore-2026", "name": "Singapore Grand Prix", "circuit": "Marina Bay", "country": "Singapore", 
     "date": "2026-10-04", "quali_date": "2026-10-03", "fp1_date": "2026-10-02", "fp1_time": "09:30", 
     "fp2_date": "2026-10-02", "fp2_time": "13:00", "fp3_date": "2026-10-03", "fp3_time": "09:30",
     "quali_time": "13:00", "race_time": "12:00", "is_sprint": False},
    {"id": "austin-2026", "name": "US Grand Prix", "circuit": "COTA", "country": "USA", 
     "date": "2026-10-18", "quali_date": "2026-10-16", "fp1_date": "2026-10-16", "fp1_time": "17:30", 
     "sprint_quali_date": "2026-10-16", "sprint_quali_time": "21:30",
     "sprint_race_date": "2026-10-17", "sprint_race_time": "18:00",
     "quali_time": "22:00", "race_time": "19:00", "is_sprint": True},
    {"id": "mexico-2026", "name": "Mexico City Grand Prix", "circuit": "Hermanos Rodríguez", "country": "Mexico", 
     "date": "2026-10-25", "quali_date": "2026-10-24", "fp1_date": "2026-10-23", "fp1_time": "18:30", 
     "fp2_date": "2026-10-23", "fp2_time": "22:00", "fp3_date": "2026-10-24", "fp3_time": "17:30",
     "quali_time": "21:00", "race_time": "20:00", "is_sprint": False},
    {"id": "brazil-2026", "name": "São Paulo Grand Prix", "circuit": "Interlagos", "country": "Brazil", 
     "date": "2026-11-08", "quali_date": "2026-11-06", "fp1_date": "2026-11-06", "fp1_time": "14:30", 
     "sprint_quali_date": "2026-11-06", "sprint_quali_time": "18:30",
     "sprint_race_date": "2026-11-07", "sprint_race_time": "14:00",
     "quali_time": "18:00", "race_time": "17:00", "is_sprint": True},
    {"id": "vegas-2026", "name": "Las Vegas Grand Prix", "circuit": "Las Vegas", "country": "USA", 
     "date": "2026-11-21", "quali_date": "2026-11-20", "fp1_date": "2026-11-19", "fp1_time": "02:30", 
     "fp2_date": "2026-11-19", "fp2_time": "06:00", "fp3_date": "2026-11-20", "fp3_time": "02:30",
     "quali_time": "06:00", "race_time": "06:00", "is_sprint": False},
    {"id": "qatar-2026", "name": "Qatar Grand Prix", "circuit": "Lusail", "country": "Qatar", 
     "date": "2026-11-29", "quali_date": "2026-11-27", "fp1_date": "2026-11-27", "fp1_time": "13:30", 
     "sprint_quali_date": "2026-11-27", "sprint_quali_time": "17:30",
     "sprint_race_date": "2026-11-28", "sprint_race_time": "14:00",
     "quali_time": "18:00", "race_time": "16:00", "is_sprint": True},
    {"id": "abudhabi-2026", "name": "Abu Dhabi Grand Prix", "circuit": "Yas Marina", "country": "UAE", 
     "date": "2026-12-06", "quali_date": "2026-12-05", "fp1_date": "2026-12-04", "fp1_time": "09:30", 
     "fp2_date": "2026-12-04", "fp2_time": "13:00", "fp3_date": "2026-12-05", "fp3_time": "10:30",
     "quali_time": "14:00", "race_time": "13:00", "is_sprint": False},
]

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id, "email": data.email, "password_hash": hash_password(data.password),
        "username": None, "current_league_id": None, "xp": 0, "level": 1,
        "avatar_id": None, "custom_avatar_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create default stats
    await db.user_stats.insert_one({"user_id": user_id, **get_default_user_stats()})
    
    token = create_token(user_id)
    return TokenResponse(access_token=token, user=UserResponse(
        id=user_id, email=data.email, username=None, created_at=user["created_at"],
        current_league_id=None, xp=0, level=1, avatar_id=None, custom_avatar_url=None
    ))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Extract IP and user agent from request
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Record login session with IP and user agent
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "login_at": datetime.now(timezone.utc).isoformat(),
        "logout_at": None,
        "user_agent": user_agent,
        "ip_address": client_ip
    }
    await db.user_sessions.insert_one(session)
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user["id"])
    return TokenResponse(access_token=token, user=UserResponse(
        id=user["id"], email=user["email"], username=user.get("username"),
        created_at=user["created_at"], current_league_id=user.get("current_league_id"),
        xp=user.get("xp", 0), level=user.get("level", 1),
        avatar_id=user.get("avatar_id"), custom_avatar_url=user.get("custom_avatar_url")
    ))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=user["id"], email=user["email"], username=user.get("username"),
        created_at=user["created_at"], current_league_id=user.get("current_league_id"),
        xp=user.get("xp", 0), level=user.get("level", 1),
        avatar_id=user.get("avatar_id"), custom_avatar_url=user.get("custom_avatar_url")
    )

@api_router.post("/auth/username", response_model=UserResponse)
async def set_username(data: UserSetUsername, user=Depends(get_current_user)):
    existing = await db.users.find_one({"username": data.username, "id": {"$ne": user["id"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    await db.users.update_one({"id": user["id"]}, {"$set": {"username": data.username}})
    return UserResponse(
        id=user["id"], email=user["email"], username=data.username,
        created_at=user["created_at"], current_league_id=user.get("current_league_id"),
        xp=user.get("xp", 0), level=user.get("level", 1)
    )

# ==================== LEAGUE ENDPOINTS ====================

@api_router.post("/leagues", response_model=LeagueResponse)
async def create_league(data: LeagueCreate, user=Depends(get_current_user)):
    league_id = str(uuid.uuid4())
    code = generate_league_code()
    while await db.leagues.find_one({"code": code}):
        code = generate_league_code()
    
    league = {
        "id": league_id, "name": data.name, "code": code, "created_by": user["id"],
        "members": [user["id"]], "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leagues.insert_one(league)
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    await db.leaderboard.insert_one({
        "id": str(uuid.uuid4()), "league_id": league_id, "user_id": user["id"],
        "total_points": 0, "last_race_points": 0, "previous_position": 1
    })
    return LeagueResponse(**{k: v for k, v in league.items() if k != "_id"})

@api_router.post("/leagues/join", response_model=LeagueResponse)
async def join_league(data: LeagueJoin, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"code": data.code.upper()}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if user["id"] in league["members"]:
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.leagues.update_one({"id": league["id"]}, {"$push": {"members": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league["id"]}})
    await db.leaderboard.insert_one({
        "id": str(uuid.uuid4()), "league_id": league["id"], "user_id": user["id"],
        "total_points": 0, "last_race_points": 0, "previous_position": len(league["members"]) + 1
    })
    league["members"].append(user["id"])
    return LeagueResponse(**league)

@api_router.get("/leagues/my", response_model=List[LeagueResponse])
async def get_my_leagues(user=Depends(get_current_user)):
    leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    return [LeagueResponse(**league) for league in leagues]

@api_router.get("/leagues/unread-messages")
async def get_unread_messages_count(user=Depends(get_current_user)):
    """Get count of unread messages for all user's leagues"""
    leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    
    unread_counts = {}
    total_unread = 0
    
    for league in leagues:
        # Get last read time for this league
        read_status = await db.chat_read_status.find_one(
            {"user_id": user["id"], "league_id": league["id"]},
            {"_id": 0}
        )
        last_read = read_status.get("last_read_at") if read_status else None
        
        # Count messages after last read
        query = {"league_id": league["id"]}
        if last_read:
            query["created_at"] = {"$gt": last_read}
        
        # Exclude own messages
        query["user_id"] = {"$ne": user["id"]}
        
        count = await db.league_messages.count_documents(query)
        if count > 0:
            unread_counts[league["id"]] = count
            total_unread += count
    
    return {
        "total_unread": total_unread,
        "by_league": unread_counts
    }

@api_router.get("/leagues/{league_id}", response_model=LeagueResponse)
async def get_league(league_id: str, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member")
    return LeagueResponse(**league)

@api_router.get("/leagues/{league_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(league_id: str, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    entries = await db.leaderboard.find({"league_id": league_id}, {"_id": 0}).to_list(100)
    entries.sort(key=lambda x: x["total_points"], reverse=True)
    
    result = []
    for i, entry in enumerate(entries):
        user_data = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0})
        position = i + 1
        position_change = entry.get("previous_position", position) - position
        # Handle None username - use "Anonymous" as fallback
        username = user_data.get("username") if user_data else None
        if not username:
            username = "Anonymous"
        result.append(LeaderboardEntry(
            user_id=entry["user_id"],
            username=username,
            total_points=entry["total_points"],
            last_race_points=entry.get("last_race_points", 0),
            position=position, position_change=position_change
        ))
    return result

@api_router.post("/leagues/{league_id}/select")
async def select_league(league_id: str, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=404, detail="League not found or not a member")
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    return {"message": "League selected", "league_id": league_id}

@api_router.put("/leagues/{league_id}")
async def update_league(league_id: str, data: LeagueUpdate, user=Depends(get_current_user)):
    """Update league name and/or description (owner only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    # Check if user is the owner
    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the league owner can update the league")
    
    # Build update dict
    update_data = {}
    if data.name is not None and data.name.strip():
        update_data["name"] = data.name.strip()
    if data.description is not None:
        update_data["description"] = data.description.strip() if data.description.strip() else None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.leagues.update_one({"id": league_id}, {"$set": update_data})
    
    # Return updated league
    updated_league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    return LeagueResponse(**updated_league)

@api_router.post("/leagues/{league_id}/leave")
async def leave_league(league_id: str, user=Depends(get_current_user)):
    """Leave a league"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    if user["id"] not in league["members"]:
        raise HTTPException(status_code=400, detail="You are not a member of this league")
    
    # Prevent owner from leaving if they are the only member or if there are other members
    if league["created_by"] == user["id"]:
        if len(league["members"]) > 1:
            raise HTTPException(status_code=400, detail="En tant que créateur, tu dois d'abord transférer la propriété ou supprimer la ligue")
        else:
            # Owner is the only member, delete the league
            await db.leagues.delete_one({"id": league_id})
            await db.league_messages.delete_many({"league_id": league_id})
            await db.leaderboard.delete_many({"league_id": league_id})
            await db.chat_read_status.delete_many({"league_id": league_id})
            
            # Update user's current league if needed
            if user.get("current_league_id") == league_id:
                await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": None}})
            
            return {"status": "success", "message": "La ligue a été supprimée car tu étais le seul membre"}
    
    # Remove user from league
    await db.leagues.update_one(
        {"id": league_id},
        {"$pull": {"members": user["id"]}}
    )
    
    # Remove from league leaderboard
    await db.leaderboard.delete_one({"league_id": league_id, "user_id": user["id"]})
    
    # Remove chat read status
    await db.chat_read_status.delete_one({"league_id": league_id, "user_id": user["id"]})
    
    # Update user's current league if needed
    if user.get("current_league_id") == league_id:
        # Set to another league or None
        other_league = await db.leagues.find_one({"members": user["id"]}, {"_id": 0})
        new_league_id = other_league["id"] if other_league else None
        await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": new_league_id}})
    
    return {"status": "success", "message": "Tu as quitté la ligue"}

@api_router.get("/leagues/by-code/{code}")
async def get_league_by_code(code: str):
    """Get league info by invitation code (public endpoint for join links)"""
    league = await db.leagues.find_one({"code": code.upper()}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    # Return limited info for preview
    return {
        "id": league["id"],
        "name": league["name"],
        "code": league["code"],
        "members_count": len(league["members"]),
        "description": league.get("description")
    }

@api_router.delete("/leagues/{league_id}")
async def delete_league(league_id: str, user=Depends(get_current_user)):
    """Delete a league (creator only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Seul le créateur peut supprimer la ligue")
    
    # Update all members' current_league_id if needed
    for member_id in league["members"]:
        member = await db.users.find_one({"id": member_id}, {"_id": 0})
        if member and member.get("current_league_id") == league_id:
            # Find another league for this user
            other_league = await db.leagues.find_one(
                {"members": member_id, "id": {"$ne": league_id}}, 
                {"_id": 0}
            )
            new_league_id = other_league["id"] if other_league else None
            await db.users.update_one(
                {"id": member_id}, 
                {"$set": {"current_league_id": new_league_id}}
            )
    
    # Delete all related data
    await db.league_messages.delete_many({"league_id": league_id})
    await db.leaderboard.delete_many({"league_id": league_id})
    await db.chat_read_status.delete_many({"league_id": league_id})
    
    # Delete the league
    await db.leagues.delete_one({"id": league_id})
    
    return {"status": "success", "message": f"La ligue '{league['name']}' a été supprimée"}

class TransferOwnershipRequest(BaseModel):
    new_owner_id: str

@api_router.post("/leagues/{league_id}/transfer")
async def transfer_league_ownership(league_id: str, data: TransferOwnershipRequest, user=Depends(get_current_user)):
    """Transfer league ownership to another member (creator only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Seul le créateur peut transférer la propriété")
    
    if data.new_owner_id == user["id"]:
        raise HTTPException(status_code=400, detail="Tu es déjà le propriétaire")
    
    if data.new_owner_id not in league["members"]:
        raise HTTPException(status_code=400, detail="Le nouveau propriétaire doit être membre de la ligue")
    
    # Get new owner info
    new_owner = await db.users.find_one({"id": data.new_owner_id}, {"_id": 0})
    if not new_owner:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Transfer ownership
    await db.leagues.update_one(
        {"id": league_id},
        {"$set": {"created_by": data.new_owner_id}}
    )
    
    new_owner_name = new_owner.get("username") or new_owner.get("email", "").split("@")[0]
    return {
        "status": "success", 
        "message": f"La propriété a été transférée à {new_owner_name}",
        "new_owner_id": data.new_owner_id
    }

# ==================== LEAGUE CHAT ====================

class ChatMessage(BaseModel):
    content: str

@api_router.post("/leagues/{league_id}/messages")
async def send_league_message(league_id: str, data: ChatMessage, user=Depends(get_current_user)):
    """Send a message to the league chat"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    if len(data.content) > 500:
        raise HTTPException(status_code=400, detail="Message too long (max 500 characters)")
    
    message = {
        "id": str(uuid.uuid4()),
        "league_id": league_id,
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "avatar_id": user.get("avatar_id"),
        "custom_avatar_url": user.get("custom_avatar_url"),
        "content": data.content.strip(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.league_messages.insert_one(message)
    return {k: v for k, v in message.items() if k != "_id"}

@api_router.get("/leagues/{league_id}/messages")
async def get_league_messages(league_id: str, limit: int = 50, before: str = None, user=Depends(get_current_user)):
    """Get messages from the league chat"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    query = {"league_id": league_id}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.league_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Return in chronological order
    return list(reversed(messages))

@api_router.get("/leagues/{league_id}/members")
async def get_league_members(league_id: str, user=Depends(get_current_user)):
    """Get all members of a league with their basic info"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    members = []
    for member_id in league["members"]:
        member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
        if member:
            members.append({
                "id": member["id"],
                "username": member.get("username", "Anonymous"),
                "avatar_id": member.get("avatar_id"),
                "custom_avatar_url": member.get("custom_avatar_url"),
                "level": member.get("level", 1),
                "xp": member.get("xp", 0),
                "is_owner": member["id"] == league["created_by"]
            })
    
    return members


@api_router.post("/leagues/{league_id}/messages/read")
async def mark_league_messages_read(league_id: str, user=Depends(get_current_user)):
    """Mark all messages in a league as read for the current user"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    await db.chat_read_status.update_one(
        {"user_id": user["id"], "league_id": league_id},
        {"$set": {"last_read_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}


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

# ==================== RACE & DRIVER ENDPOINTS ====================

@api_router.get("/drivers", response_model=List[DriverResponse])
async def get_drivers():
    return [DriverResponse(**d) for d in F1_DRIVERS_2026]

@api_router.get("/races", response_model=List[RaceResponse])
async def get_races():
    now = datetime.now(timezone.utc)
    races = []
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        has_results = result_doc and result_doc.get("results") and result_doc.get("results", {}).get("race_winner")
        
        # Status determination: if results exist, race is finished
        if has_results:
            status = "finished"
        elif now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        race_response = {
            "id": race["id"], "name": race["name"], "circuit": race["circuit"],
            "country": race["country"], "date": race_date.isoformat(),
            "quali_date": quali_date.isoformat(),
            "predictions_close_at": predictions_close.isoformat(),
            "status": status, "is_sprint_weekend": race.get("is_sprint", False),
            "results": result_doc.get("results") if result_doc else None
        }
        
        if race.get("is_sprint"):
            race_response["sprint_quali_date"] = race.get("sprint_quali_date", "") + "T10:00:00+00:00"
            race_response["sprint_race_date"] = race.get("sprint_race_date", "") + "T14:00:00+00:00"
        
        races.append(RaceResponse(**race_response))
    
    return races

@api_router.get("/races/next", response_model=RaceResponse)
async def get_next_race():
    now = datetime.now(timezone.utc)
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        if now < race_date:
            quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
            predictions_close = get_predictions_close_time(race)
            status = "upcoming" if now < predictions_close else "in_progress"
            
            fp1_datetime = datetime.fromisoformat(f"{race['fp1_date']}T{race['fp1_time']}:00+00:00")
            
            response = {
                "id": race["id"], "name": race["name"], "circuit": race["circuit"],
                "country": race["country"], "date": race_date.isoformat(),
                "quali_date": quali_date.isoformat(),
                "fp1_date": fp1_datetime.isoformat(),
                "predictions_close_at": predictions_close.isoformat(),
                "status": status, "is_sprint_weekend": race.get("is_sprint", False),
                "results": None
            }
            if race.get("is_sprint"):
                response["sprint_quali_date"] = race.get("sprint_quali_date", "") + "T10:00:00+00:00"
                response["sprint_race_date"] = race.get("sprint_race_date", "") + "T14:00:00+00:00"
            return RaceResponse(**response)
    
    # Return last race if all finished
    race = F1_RACES_2026[-1]
    return RaceResponse(
        id=race["id"], name=race["name"], circuit=race["circuit"],
        country=race["country"], date=race["date"] + "T15:00:00+00:00",
        quali_date=race["quali_date"] + "T14:00:00+00:00",
        predictions_close_at=get_predictions_close_time(race).isoformat(),
        status="finished", is_sprint_weekend=race.get("is_sprint", False), results=None
    )

@api_router.get("/races/upcoming")
async def get_upcoming_races():
    """Get all upcoming races for the season (for predictions calendar)"""
    now = datetime.now(timezone.utc)
    upcoming = []
    
    for race in F1_RACES_2026:
        race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T" + race.get("quali_time", "14:00") + ":00+00:00")
        predictions_close = get_predictions_close_time(race)
        sprint_predictions_close = get_sprint_predictions_close_time(race)
        
        # Determine status based on main race
        if now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        # Check if user can still predict main race (15 min before Q1)
        can_predict = now < predictions_close
        
        # Check if user can still predict sprint (15 min before SQ1)
        can_predict_sprint = sprint_predictions_close and now < sprint_predictions_close
        
        race_data = {
            "id": race["id"],
            "name": race["name"],
            "circuit": race["circuit"],
            "country": race["country"],
            "date": race_date.isoformat(),
            "quali_date": quali_date.isoformat(),
            "predictions_close_at": predictions_close.isoformat(),
            "sprint_predictions_close_at": sprint_predictions_close.isoformat() if sprint_predictions_close else None,
            "status": status,
            "can_predict": can_predict,
            "can_predict_sprint": can_predict_sprint,
            "is_sprint_weekend": race.get("is_sprint", False)
        }
        
        upcoming.append(race_data)
    
    return upcoming

@api_router.get("/races/{race_id}")
async def get_race(race_id: str):
    for race in F1_RACES_2026:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
            quali_date = datetime.fromisoformat(race["quali_date"] + "T" + race.get("quali_time", "14:00") + ":00+00:00")
            predictions_close = get_predictions_close_time(race)
            sprint_predictions_close = get_sprint_predictions_close_time(race)
            
            if now < predictions_close:
                status = "upcoming"
            elif now < race_date:
                status = "in_progress"
            else:
                status = "finished"
            
            # Check if user can still predict
            can_predict = now < predictions_close
            can_predict_sprint = sprint_predictions_close and now < sprint_predictions_close
            
            result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
            
            return {
                "id": race["id"], "name": race["name"], "circuit": race["circuit"],
                "country": race["country"], "date": race_date.isoformat(),
                "quali_date": quali_date.isoformat(),
                "sprint_quali_date": (race.get("sprint_quali_date", "") + "T" + race.get("sprint_quali_time", "10:30") + ":00+00:00") if race.get("is_sprint") else None,
                "sprint_race_date": (race.get("sprint_race_date", "") + "T" + race.get("sprint_race_time", "14:00") + ":00+00:00") if race.get("is_sprint") else None,
                "predictions_close_at": predictions_close.isoformat(),
                "sprint_predictions_close_at": sprint_predictions_close.isoformat() if sprint_predictions_close else None,
                "can_predict": can_predict,
                "can_predict_sprint": can_predict_sprint,
                "status": status, "is_sprint_weekend": race.get("is_sprint", False),
                "results": result_doc.get("results") if result_doc else None
            }
    raise HTTPException(status_code=404, detail="Race not found")

@api_router.get("/races/{race_id}/details")
async def get_race_details(race_id: str):
    """Get detailed information for a specific race including circuit info and session times"""
    for race in F1_RACES_2026:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T" + race.get("race_time", "15:00") + ":00+00:00")
            predictions_close = get_predictions_close_time(race)
            
            if now < predictions_close:
                status = "upcoming"
            elif now < race_date:
                status = "in_progress"
            else:
                status = "finished"
            
            # Get circuit details
            circuit_name = race["circuit"]
            circuit_info = F1_CIRCUITS.get(circuit_name, {})
            
            # Build session schedule
            sessions = []
            
            # FP1
            if race.get("fp1_date") and race.get("fp1_time"):
                sessions.append({
                    "name": "Essais Libres 1",
                    "short_name": "FP1",
                    "datetime": f"{race['fp1_date']}T{race['fp1_time']}:00+00:00"
                })
            
            # FP2 (only for non-sprint weekends)
            if not race.get("is_sprint") and race.get("fp2_date") and race.get("fp2_time"):
                sessions.append({
                    "name": "Essais Libres 2",
                    "short_name": "FP2",
                    "datetime": f"{race['fp2_date']}T{race['fp2_time']}:00+00:00"
                })
            
            # Sprint Quali (for sprint weekends)
            if race.get("is_sprint") and race.get("sprint_quali_date") and race.get("sprint_quali_time"):
                sessions.append({
                    "name": "Sprint Shootout",
                    "short_name": "SQ",
                    "datetime": f"{race['sprint_quali_date']}T{race['sprint_quali_time']}:00+00:00"
                })
            
            # FP3 (only for non-sprint weekends)
            if not race.get("is_sprint") and race.get("fp3_date") and race.get("fp3_time"):
                sessions.append({
                    "name": "Essais Libres 3",
                    "short_name": "FP3",
                    "datetime": f"{race['fp3_date']}T{race['fp3_time']}:00+00:00"
                })
            
            # Sprint Race (for sprint weekends)
            if race.get("is_sprint") and race.get("sprint_race_date") and race.get("sprint_race_time"):
                sessions.append({
                    "name": "Course Sprint",
                    "short_name": "SPRINT",
                    "datetime": f"{race['sprint_race_date']}T{race['sprint_race_time']}:00+00:00"
                })
            
            # Qualifying
            if race.get("quali_date") and race.get("quali_time"):
                sessions.append({
                    "name": "Qualifications",
                    "short_name": "QUALI",
                    "datetime": f"{race['quali_date']}T{race['quali_time']}:00+00:00"
                })
            
            # Race
            sessions.append({
                "name": "Course",
                "short_name": "COURSE",
                "datetime": race_date.isoformat()
            })
            
            # Sort sessions by datetime
            sessions.sort(key=lambda x: x["datetime"])
            
            return {
                "id": race["id"],
                "name": race["name"],
                "country": race["country"],
                "status": status,
                "is_sprint_weekend": race.get("is_sprint", False),
                "predictions_close_at": predictions_close.isoformat(),
                "circuit": {
                    "name": circuit_name,
                    "full_name": circuit_info.get("full_name", circuit_name),
                    "length_km": circuit_info.get("length_km"),
                    "turns": circuit_info.get("turns"),
                    "laps": circuit_info.get("laps")
                },
                "sessions": sessions
            }
    raise HTTPException(status_code=404, detail="Race not found")

# ==================== PREDICTION ENDPOINTS ====================

@api_router.post("/predictions")
async def create_prediction(data: PredictionCreate, user=Depends(get_current_user)):
    # Validate race
    race = None
    for r in F1_RACES_2026:
        if r["id"] == data.race_id:
            race = r
            break
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # Check predictions close time (15 min before FP1)
    predictions_close = get_predictions_close_time(race)
    
    if datetime.now(timezone.utc) > predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sont fermés (15 min avant les FP1)")
    
    # Validate Top 10
    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Top 10 must have exactly 10 drivers")
    
    # Validate sprint if sprint weekend
    if race.get("is_sprint"):
        if not data.sprint_quali_pole:
            raise HTTPException(status_code=400, detail="Sprint quali pole required for sprint weekend")
        if not data.sprint_quali_top10 or len(data.sprint_quali_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint quali top 10 required for sprint weekend")
        if not data.sprint_race_winner:
            raise HTTPException(status_code=400, detail="Sprint race winner required for sprint weekend")
        if not data.sprint_race_top10 or len(data.sprint_race_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint race top 10 required for sprint weekend")
    
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})
    
    prediction_data = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "sprint_quali_pole": data.sprint_quali_pole if race.get("is_sprint") else None,
        "sprint_quali_top10": data.sprint_quali_top10 if race.get("is_sprint") else None,
        "sprint_race_winner": data.sprint_race_winner if race.get("is_sprint") else None,
        "sprint_race_top10": data.sprint_race_top10 if race.get("is_sprint") else None,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus_bets": data.bonus_bets.dict() if data.bonus_bets else None,
        "custom_predictions": data.custom_predictions,
        "updated_at": now
    }
    
    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": prediction_data})
        # Exclude MongoDB _id from response
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **prediction_data, "locked": False}
    
    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id, "user_id": user["id"], "race_id": data.race_id,
        **prediction_data, "locked": False, "created_at": now
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}

@api_router.get("/predictions/race/{race_id}")
async def get_my_prediction(race_id: str, user=Depends(get_current_user)):
    prediction = await db.predictions.find_one({"user_id": user["id"], "race_id": race_id}, {"_id": 0})
    return prediction

@api_router.delete("/predictions/race/{race_id}")
async def delete_my_prediction(race_id: str, user=Depends(get_current_user)):
    """Delete user's prediction for a specific race"""
    # Check if race exists
    race = next((r for r in F1_RACES_2026 if r["id"] == race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Course non trouvée")
    
    # Check if predictions are still open (can only delete if not closed)
    close_time = get_predictions_close_time(race)
    if datetime.now(timezone.utc) >= close_time:
        raise HTTPException(status_code=400, detail="Les pronostics sont clôturés, suppression impossible")
    
    # Delete the prediction
    result = await db.predictions.delete_one({"user_id": user["id"], "race_id": race_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aucun pronostic trouvé pour cette course")
    
    return {"message": "Pronostics supprimés avec succès"}

@api_router.get("/predictions/history")
async def get_prediction_history(user=Depends(get_current_user)):
    predictions = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return predictions

@api_router.get("/predictions/stats")
async def get_prediction_stats(user=Depends(get_current_user)):
    """Get prediction statistics for the current user with individual counting"""
    total_predictions = await count_individual_predictions(user["id"])
    races_participated = await db.predictions.count_documents({"user_id": user["id"]})
    
    return {
        "total_predictions": total_predictions,
        "races_participated": races_participated
    }

@api_router.get("/predictions/points-history")
async def get_points_history(user=Depends(get_current_user)):
    """Get detailed points history for the user - breakdown by race"""
    # Get all user predictions
    predictions = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    history = []
    race_map = {r["id"]: r for r in F1_RACES_2026}
    
    for pred in predictions:
        race_id = pred.get("race_id")
        race = race_map.get(race_id)
        if not race:
            continue
        
        # Get results for this race
        result = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
        
        if result:
            # Calculate points breakdown
            points = calculate_points(pred, result.get("results", {}))
            
            history_entry = {
                "race_id": race_id,
                "race_name": race["name"],
                "race_date": race.get("date"),
                "is_sprint_weekend": race.get("is_sprint", False),
                "has_results": True,
                "points_breakdown": {
                    "quali_pole": {"points": points["quali_pole"], "label": "Pole Position"},
                    "quali_top10": {"points": points["quali_top10"], "label": "Top 10 Qualifications"},
                    "race_winner": {"points": points["race_winner"], "label": "Vainqueur Course"},
                    "race_top10": {"points": points["race_top10"], "label": "Top 10 Course"},
                    "bonus": {"points": points["bonus"], "label": "Bonus (SC, DNF, Meilleur tour, Leader T1)"},
                },
                "sprint_breakdown": None,
                "total_points": points["total"],
                "xp_earned": points["xp_earned"],
                "details": points["details"]
            }
            
            # Add sprint breakdown if sprint weekend
            if race.get("is_sprint"):
                history_entry["sprint_breakdown"] = {
                    "sprint_quali_top10": {"points": points["sprint_quali_top10"], "label": "Top 10 Qualif Sprint"},
                    "sprint_race_top10": {"points": points["sprint_race_top10"], "label": "Top 10 Course Sprint"},
                }
            
            history.append(history_entry)
        else:
            # No results yet - show prediction was made
            history.append({
                "race_id": race_id,
                "race_name": race["name"],
                "race_date": race.get("date"),
                "is_sprint_weekend": race.get("is_sprint", False),
                "has_results": False,
                "points_breakdown": None,
                "sprint_breakdown": None,
                "total_points": 0,
                "xp_earned": 0,
                "details": ["En attente des résultats"]
            })
    
    # Sort by race date (most recent first)
    history.sort(key=lambda x: x.get("race_date", ""), reverse=True)
    
    # Calculate totals
    total_points = sum(h["total_points"] for h in history)
    total_xp = sum(h["xp_earned"] for h in history)
    
    return {
        "history": history,
        "summary": {
            "total_points": total_points,
            "total_xp": total_xp,
            "races_with_results": len([h for h in history if h["has_results"]]),
            "races_pending": len([h for h in history if not h["has_results"]])
        }
    }

# ==================== SEPARATE SPRINT/MAIN PREDICTIONS ====================

@api_router.post("/predictions/sprint")
async def save_sprint_prediction(data: SprintPredictionCreate, user=Depends(get_current_user)):
    """Save sprint predictions separately (closes 15 min before SQ1)"""
    # Validate race
    race = None
    for r in F1_RACES_2026:
        if r["id"] == data.race_id:
            race = r
            break
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    if not race.get("is_sprint"):
        raise HTTPException(status_code=400, detail="This is not a sprint weekend")
    
    # Check sprint predictions close time (15 min before SQ1)
    sprint_predictions_close = get_sprint_predictions_close_time(race)
    if datetime.now(timezone.utc) > sprint_predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sprint sont fermés (15 min avant SQ1)")
    
    # Validate Top 10
    if len(data.sprint_quali_top10) != 10 or len(data.sprint_race_top10) != 10:
        raise HTTPException(status_code=400, detail="Sprint Top 10 must have exactly 10 drivers")
    
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})
    
    sprint_data = {
        "sprint_quali_pole": data.sprint_quali_pole,
        "sprint_quali_top10": data.sprint_quali_top10,
        "sprint_race_winner": data.sprint_race_winner,
        "sprint_race_top10": data.sprint_race_top10,
        "sprint_bonus_bets": data.sprint_bonus_bets.dict() if data.sprint_bonus_bets else None,
        "sprint_updated_at": now
    }
    
    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": sprint_data})
        # Exclude MongoDB _id from response
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **sprint_data}
    
    # Create new prediction with sprint data only
    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id, "user_id": user["id"], "race_id": data.race_id,
        **sprint_data, "locked": False, "created_at": now
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}

@api_router.post("/predictions/main")
async def save_main_prediction(data: MainPredictionCreate, user=Depends(get_current_user)):
    """Save main race predictions separately (closes 15 min before Q1)"""
    # Validate race
    race = None
    for r in F1_RACES_2026:
        if r["id"] == data.race_id:
            race = r
            break
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    # Check main predictions close time (15 min before Q1)
    predictions_close = get_predictions_close_time(race)
    if datetime.now(timezone.utc) > predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sont fermés (15 min avant Q1)")
    
    # Validate Top 10
    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Top 10 must have exactly 10 drivers")
    
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})
    
    main_data = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus_bets": data.bonus_bets.dict() if data.bonus_bets else None,
        "main_updated_at": now
    }
    
    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": main_data})
        # Exclude MongoDB _id from response
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **main_data}
    
    # Create new prediction with main data only
    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id, "user_id": user["id"], "race_id": data.race_id,
        **main_data, "locked": False, "created_at": now
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}

# ==================== CUSTOM PREDICTIONS ====================

@api_router.post("/custom-predictions")
async def create_custom_prediction(data: CustomPredictionCreate, user=Depends(get_current_user)):
    # Verify user is member of the league
    league = await db.leagues.find_one({"id": data.league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    prediction_id = str(uuid.uuid4())
    # Auto-generate IDs for choices if not provided
    processed_choices = None
    if data.choices:
        processed_choices = []
        for i, c in enumerate(data.choices):
            choice_dict = c.dict()
            if not choice_dict.get("id"):
                choice_dict["id"] = f"choice_{i}"
            processed_choices.append(choice_dict)
    
    custom_pred = {
        "id": prediction_id,
        "race_id": data.race_id,
        "league_id": data.league_id,
        "created_by": user["id"],
        "question": data.question,
        "answer_type": data.answer_type,
        "multiple_choice": data.multiple_choice,
        "choices": processed_choices,
        "correct_answer": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.custom_predictions.insert_one(custom_pred)
    return {k: v for k, v in custom_pred.items() if k != "_id"}

@api_router.get("/custom-predictions/league/{league_id}/race/{race_id}")
async def get_league_custom_predictions(league_id: str, race_id: str, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    predictions = await db.custom_predictions.find(
        {"league_id": league_id, "race_id": race_id}, {"_id": 0}
    ).to_list(100)
    return predictions

@api_router.post("/custom-predictions/{prediction_id}/answer")
async def answer_custom_prediction(prediction_id: str, answer: dict, user=Depends(get_current_user)):
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=404, detail="Custom prediction not found")
    
    # Store user's answer
    await db.custom_prediction_answers.update_one(
        {"prediction_id": prediction_id, "user_id": user["id"]},
        {"$set": {
            "prediction_id": prediction_id,
            "user_id": user["id"],
            "answer": answer.get("answer"),
            "answered_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Answer saved"}

@api_router.post("/custom-predictions/{prediction_id}/set-correct")
async def set_correct_answer(prediction_id: str, data: dict, user=Depends(get_current_user)):
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=404, detail="Custom prediction not found")
    if custom_pred["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only creator can set correct answer")
    
    await db.custom_predictions.update_one(
        {"id": prediction_id},
        {"$set": {"correct_answer": data.get("correct_answer")}}
    )
    
    # Calculate points for all answers
    answers = await db.custom_prediction_answers.find({"prediction_id": prediction_id}, {"_id": 0}).to_list(1000)
    correct = data.get("correct_answer")
    
    for ans in answers:
        user_answer = ans.get("answer")
        is_correct = False
        
        if custom_pred["multiple_choice"]:
            # For multiple choice, check if any answer matches
            if isinstance(user_answer, list) and isinstance(correct, list):
                is_correct = any(a in correct for a in user_answer)
            elif isinstance(user_answer, list):
                is_correct = correct in user_answer
        else:
            is_correct = user_answer == correct
        
        if is_correct:
            # Award 2 points
            league = await db.leagues.find_one({"id": custom_pred["league_id"]}, {"_id": 0})
            if league:
                await db.leaderboard.update_one(
                    {"league_id": league["id"], "user_id": ans["user_id"]},
                    {"$inc": {"total_points": 2}}
                )
                await db.users.update_one({"id": ans["user_id"]}, {"$inc": {"xp": 10}})
    
    return {"message": "Correct answer set and points calculated"}

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

# ==================== MINI-GAMES ====================

@api_router.post("/minigames/reaction")
async def submit_reaction_game(data: ReactionGameResult, user=Depends(get_current_user)):
    """Submit a reaction game result"""
    # Validate race and league
    if not data.is_training:
        league = await db.leagues.find_one({"id": data.league_id}, {"_id": 0})
        if not league or user["id"] not in league["members"]:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
        # Check attempts for this race weekend
        existing_attempts = await db.minigame_results.count_documents({
            "user_id": user["id"],
            "race_id": data.race_id,
            "league_id": data.league_id,
            "game_type": "reaction",
            "is_training": False
        })
        
        if existing_attempts >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 attempts per race weekend")
    
    # Save result
    result_id = str(uuid.uuid4())
    result_doc = {
        "id": result_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        "league_id": data.league_id,
        "game_type": "reaction",
        "score": data.reaction_time_ms,
        "is_training": data.is_training,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.minigame_results.insert_one(result_doc)
    
    # Update stats
    stats_update = {"$inc": {"reaction_games_played": 1}}
    
    # Check for sub-200ms achievement
    if data.reaction_time_ms < 200:
        stats_update["$inc"]["reaction_sub_200"] = 1
    
    # Update best time
    stats_doc = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if stats_doc:
        current_best = stats_doc.get("best_reaction_time")
        if current_best is None or data.reaction_time_ms < current_best:
            stats_update["$set"] = {"best_reaction_time": data.reaction_time_ms}
    
    await db.user_stats.update_one(
        {"user_id": user["id"]},
        stats_update,
        upsert=True
    )
    
    # Award XP
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"xp": XP_REWARDS["minigame_played"]}}
    )
    
    return {
        "message": "Result saved",
        "result_id": result_id,
        "reaction_time_ms": data.reaction_time_ms,
        "is_training": data.is_training
    }

@api_router.post("/minigames/batak")
async def submit_batak_game(data: BatakGameResult, user=Depends(get_current_user)):
    """Submit a batak game result"""
    if not data.is_training:
        league = await db.leagues.find_one({"id": data.league_id}, {"_id": 0})
        if not league or user["id"] not in league["members"]:
            raise HTTPException(status_code=403, detail="Not a member of this league")
        
        existing_attempts = await db.minigame_results.count_documents({
            "user_id": user["id"],
            "race_id": data.race_id,
            "league_id": data.league_id,
            "game_type": "batak",
            "is_training": False
        })
        
        if existing_attempts >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 attempts per race weekend")
    
    result_id = str(uuid.uuid4())
    result_doc = {
        "id": result_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        "league_id": data.league_id,
        "game_type": "batak",
        "score": data.score,
        "time_seconds": data.time_seconds,
        "is_training": data.is_training,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.minigame_results.insert_one(result_doc)
    
    stats_update = {"$inc": {"batak_games_played": 1}}
    
    if data.score >= 30:
        stats_update["$inc"]["batak_30_targets"] = 1
    
    stats_doc = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if stats_doc:
        current_best = stats_doc.get("best_batak_score")
        if current_best is None or data.score > current_best:
            stats_update["$set"] = {"best_batak_score": data.score}
    
    await db.user_stats.update_one(
        {"user_id": user["id"]},
        stats_update,
        upsert=True
    )
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"xp": XP_REWARDS["minigame_played"]}}
    )
    
    return {
        "message": "Result saved",
        "result_id": result_id,
        "score": data.score,
        "is_training": data.is_training
    }

@api_router.get("/minigames/leaderboard/{game_type}/{league_id}/{race_id}")
async def get_minigame_leaderboard(
    game_type: str,
    league_id: str,
    race_id: str,
    user=Depends(get_current_user)
):
    """Get mini-game leaderboard for a specific race weekend"""
    if game_type not in ["reaction", "batak"]:
        raise HTTPException(status_code=400, detail="Invalid game type")
    
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    # Get all results for this game/league/race
    results = await db.minigame_results.find({
        "league_id": league_id,
        "race_id": race_id,
        "game_type": game_type,
        "is_training": False
    }, {"_id": 0}).to_list(1000)
    
    # Group by user and get best score
    user_best = {}
    user_attempts = {}
    for r in results:
        uid = r["user_id"]
        score = r["score"]
        
        if uid not in user_attempts:
            user_attempts[uid] = 0
        user_attempts[uid] += 1
        
        if uid not in user_best:
            user_best[uid] = score
        else:
            if game_type == "reaction":
                user_best[uid] = min(user_best[uid], score)  # Lower is better
            else:
                user_best[uid] = max(user_best[uid], score)  # Higher is better
    
    # Build leaderboard
    leaderboard_data = []
    for uid, best_score in user_best.items():
        user_data = await db.users.find_one({"id": uid}, {"_id": 0})
        if user_data:
            leaderboard_data.append({
                "user_id": uid,
                "username": user_data.get("username", "Anonymous"),
                "avatar_id": user_data.get("avatar_id"),
                "best_score": best_score,
                "attempts_used": user_attempts.get(uid, 0)
            })
    
    # Sort
    if game_type == "reaction":
        leaderboard_data.sort(key=lambda x: x["best_score"])  # Lower is better
    else:
        leaderboard_data.sort(key=lambda x: x["best_score"], reverse=True)  # Higher is better
    
    # Add positions
    result = []
    for i, entry in enumerate(leaderboard_data):
        entry["position"] = i + 1
        result.append(MinigameLeaderboardEntry(**entry))
    
    return {
        "leaderboard": result,
        "game_type": game_type,
        "race_id": race_id,
        "league_id": league_id
    }

@api_router.get("/minigames/attempts/{game_type}/{league_id}/{race_id}")
async def get_my_minigame_attempts(
    game_type: str,
    league_id: str,
    race_id: str,
    user=Depends(get_current_user)
):
    """Get user's attempts for a specific mini-game"""
    results = await db.minigame_results.find({
        "user_id": user["id"],
        "league_id": league_id,
        "race_id": race_id,
        "game_type": game_type,
        "is_training": False
    }, {"_id": 0}).to_list(10)
    
    return {
        "attempts": results,
        "attempts_used": len(results),
        "attempts_remaining": max(0, 3 - len(results))
    }

@api_router.get("/minigames/global-leaderboard/{game_type}")
async def get_global_minigame_leaderboard(game_type: str, user=Depends(get_current_user)):
    """Get global mini-game leaderboard (all time best scores)"""
    if game_type not in ["reaction", "batak"]:
        raise HTTPException(status_code=400, detail="Invalid game type")
    
    # Get best score per user
    stat_field = "best_reaction_time" if game_type == "reaction" else "best_batak_score"
    
    stats = await db.user_stats.find(
        {stat_field: {"$ne": None}}, {"_id": 0}
    ).to_list(10000)
    
    leaderboard_data = []
    for s in stats:
        user_data = await db.users.find_one({"id": s["user_id"]}, {"_id": 0})
        if user_data and user_data.get("username"):
            leaderboard_data.append({
                "user_id": s["user_id"],
                "username": user_data.get("username", "Anonymous"),
                "avatar_id": user_data.get("avatar_id"),
                "best_score": s[stat_field],
                "attempts_used": 0  # Not relevant for global
            })
    
    # Sort
    if game_type == "reaction":
        leaderboard_data.sort(key=lambda x: x["best_score"])
    else:
        leaderboard_data.sort(key=lambda x: x["best_score"], reverse=True)
    
    result = []
    for i, entry in enumerate(leaderboard_data[:100]):
        entry["position"] = i + 1
        result.append(MinigameLeaderboardEntry(**entry))
    
    return {"leaderboard": result, "game_type": game_type}

@api_router.post("/admin/minigames/award-winners/{race_id}")
async def award_minigame_winners(race_id: str, user=Depends(get_current_user)):
    """Award +2 points to mini-game winners for each league after race weekend"""
    # Verify user is admin (league owner)
    leagues_owned = await db.leagues.find({"owner_id": user["id"]}, {"_id": 0}).to_list(100)
    if not leagues_owned:
        raise HTTPException(status_code=403, detail="Only league owners can award mini-game points")
    
    total_awards = 0
    
    for league in leagues_owned:
        league_id = league["id"]
        
        for game_type in ["reaction", "batak"]:
            # Get all competition results for this game/league/race
            results = await db.minigame_results.find({
                "league_id": league_id,
                "race_id": race_id,
                "game_type": game_type,
                "is_training": False
            }, {"_id": 0}).to_list(1000)
            
            if not results:
                continue
            
            # Group by user and get best score
            user_best = {}
            for r in results:
                uid = r["user_id"]
                score = r["score"]
                
                if uid not in user_best:
                    user_best[uid] = score
                else:
                    if game_type == "reaction":
                        user_best[uid] = min(user_best[uid], score)  # Lower is better
                    else:
                        user_best[uid] = max(user_best[uid], score)  # Higher is better
            
            if not user_best:
                continue
            
            # Find winner
            if game_type == "reaction":
                winner_id = min(user_best.keys(), key=lambda k: user_best[k])
            else:
                winner_id = max(user_best.keys(), key=lambda k: user_best[k])
            
            # Check if already awarded
            existing_award = await db.minigame_awards.find_one({
                "league_id": league_id,
                "race_id": race_id,
                "game_type": game_type
            })
            
            if existing_award:
                continue  # Already awarded
            
            # Award 2 points to winner
            await db.leaderboard.update_one(
                {"league_id": league_id, "user_id": winner_id},
                {"$inc": {"total_points": 2, "minigame_points": 2}},
                upsert=True
            )
            
            # Record the award
            await db.minigame_awards.insert_one({
                "id": str(uuid.uuid4()),
                "league_id": league_id,
                "race_id": race_id,
                "game_type": game_type,
                "winner_id": winner_id,
                "points_awarded": 2,
                "awarded_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Update winner stats
            await db.user_stats.update_one(
                {"user_id": winner_id},
                {"$inc": {f"{game_type}_wins": 1}},
                upsert=True
            )
            
            # Award XP
            await db.users.update_one(
                {"id": winner_id},
                {"$inc": {"xp": XP_REWARDS["minigame_won"]}}
            )
            
            # Notification
            game_name = "Reaction Time" if game_type == "reaction" else "Batak"
            await send_user_notification(
                winner_id,
                f"Tu as gagné le mini-jeu {game_name} dans {league['name']} ! +2 points",
                "minigame_win"
            )
            
            total_awards += 1
    
    return {"message": f"{total_awards} awards distributed", "total_awards": total_awards}

@api_router.get("/minigames/winners/{league_id}/{race_id}")
async def get_minigame_winners(league_id: str, race_id: str, user=Depends(get_current_user)):
    """Get mini-game winners for a specific race weekend"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")
    
    awards = await db.minigame_awards.find({
        "league_id": league_id,
        "race_id": race_id
    }, {"_id": 0}).to_list(10)
    
    result = []
    for award in awards:
        winner_data = await db.users.find_one({"id": award["winner_id"]}, {"_id": 0})
        result.append({
            "game_type": award["game_type"],
            "winner_id": award["winner_id"],
            "winner_username": winner_data.get("username", "Unknown") if winner_data else "Unknown",
            "points_awarded": award["points_awarded"]
        })
    
    return {"winners": result, "race_id": race_id, "league_id": league_id}

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

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
