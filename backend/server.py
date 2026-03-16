from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
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

# Helper function to calculate predictions close time (15 min before FP1)
def get_predictions_close_time(race: dict) -> datetime:
    """Calculate when predictions close - 15 minutes before FP1 start"""
    fp1_date = race.get("fp1_date", race["quali_date"])
    fp1_time = race.get("fp1_time", "14:00")
    fp1_datetime = datetime.fromisoformat(f"{fp1_date}T{fp1_time}:00+00:00")
    return fp1_datetime - timedelta(minutes=15)

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

class LeagueJoin(BaseModel):
    code: str

class LeagueResponse(BaseModel):
    id: str
    name: str
    code: str
    created_by: str
    members: List[str]
    created_at: str

# Extended prediction models for Top 10 + Sprint
class BonusBets(BaseModel):
    safety_car: bool = False
    dnf_drivers: List[str] = []  # Changed from bool to list of driver IDs
    fastest_lap_driver: Optional[str] = None
    first_corner_leader: Optional[str] = None  # NEW: Leader after first corner

class PredictionCreate(BaseModel):
    race_id: str
    # Qualifications Race (Top 10)
    quali_pole: str
    quali_top10: List[str]  # Extended to Top 10
    # Sprint Qualifications (Top 10) - only for sprint weekends
    sprint_quali_top10: Optional[List[str]] = None
    # Sprint Race (Top 10) - only for sprint weekends
    sprint_race_top10: Optional[List[str]] = None
    # Main Race (Top 10)
    race_winner: str
    race_top10: List[str]  # Extended to Top 10
    # Bonus bets
    bonus_bets: Optional[BonusBets] = None
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
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
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
        
        if now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        
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
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = get_predictions_close_time(race)
        fp1_datetime = datetime.fromisoformat(f"{race['fp1_date']}T{race['fp1_time']}:00+00:00")
        
        # Determine status
        if now < predictions_close:
            status = "upcoming"
        elif now < race_date:
            status = "in_progress"
        else:
            status = "finished"
        
        # Check if user can still predict
        can_predict = now < predictions_close
        
        race_data = {
            "id": race["id"],
            "name": race["name"],
            "circuit": race["circuit"],
            "country": race["country"],
            "date": race_date.isoformat(),
            "quali_date": quali_date.isoformat(),
            "fp1_date": fp1_datetime.isoformat(),
            "predictions_close_at": predictions_close.isoformat(),
            "status": status,
            "can_predict": can_predict,
            "is_sprint_weekend": race.get("is_sprint", False)
        }
        
        upcoming.append(race_data)
    
    return upcoming

@api_router.get("/races/{race_id}")
async def get_race(race_id: str):
    for race in F1_RACES_2026:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
            quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
            predictions_close = get_predictions_close_time(race)
            fp1_datetime = datetime.fromisoformat(f"{race['fp1_date']}T{race['fp1_time']}:00+00:00")
            
            if now < predictions_close:
                status = "upcoming"
            elif now < race_date:
                status = "in_progress"
            else:
                status = "finished"
            
            result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
            
            return {
                "id": race["id"], "name": race["name"], "circuit": race["circuit"],
                "country": race["country"], "date": race_date.isoformat(),
                "quali_date": quali_date.isoformat(),
                "fp1_date": fp1_datetime.isoformat(),
                "sprint_quali_date": (race.get("sprint_quali_date", "") + "T10:00:00+00:00") if race.get("is_sprint") else None,
                "sprint_race_date": (race.get("sprint_race_date", "") + "T14:00:00+00:00") if race.get("is_sprint") else None,
                "predictions_close_at": predictions_close.isoformat(),
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
            quali_date = datetime.fromisoformat(race["quali_date"] + "T" + race.get("quali_time", "14:00") + ":00+00:00")
            fp1_datetime = datetime.fromisoformat(f"{race['fp1_date']}T{race['fp1_time']}:00+00:00")
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
        if not data.sprint_quali_top10 or len(data.sprint_quali_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint quali top 10 required for sprint weekend")
        if not data.sprint_race_top10 or len(data.sprint_race_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint race top 10 required for sprint weekend")
    
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})
    
    prediction_data = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "sprint_quali_top10": data.sprint_quali_top10 if race.get("is_sprint") else None,
        "sprint_race_top10": data.sprint_race_top10 if race.get("is_sprint") else None,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus_bets": data.bonus_bets.dict() if data.bonus_bets else None,
        "custom_predictions": data.custom_predictions,
        "updated_at": now
    }
    
    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": prediction_data})
        return {**existing, **prediction_data, "locked": False}
    
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

@api_router.get("/predictions/history")
async def get_prediction_history(user=Depends(get_current_user)):
    predictions = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return predictions

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
                await create_notification(pred["user_id"], f"Niveau {new_level} atteint !", "level_up")
            
            race_name = next((r["name"] for r in F1_RACES_2026 if r["id"] == race_id), race_id)
            await create_notification(pred["user_id"], f"Résultats {race_name}: +{points['total']} pts!", "results")
            
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
    """Fetch results from OpenF1 API"""
    user_leagues = await db.leagues.find({"created_by": user["id"]}, {"_id": 0}).to_list(100)
    if not user_leagues:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find race info
    race = next((r for r in F1_RACES_2026 if r["id"] == race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get session info for this race
            # OpenF1 uses meeting_key, we need to map race to meeting
            # For now, return instructions since we need the actual meeting_key
            
            # Try to get latest session data
            sessions_resp = await client.get(f"{OPENF1_API}/sessions", params={
                "year": 2026,
                "circuit_short_name": race["circuit"].split()[0][:3].upper()
            })
            
            if sessions_resp.status_code != 200:
                return {"status": "error", "message": "Could not fetch sessions from OpenF1", "manual_entry_required": True}
            
            sessions = sessions_resp.json()
            if not sessions:
                return {"status": "no_data", "message": "No session data available yet", "manual_entry_required": True}
            
            # Get race session
            race_session = next((s for s in sessions if s.get("session_name") == "Race"), None)
            if not race_session:
                return {"status": "no_race", "message": "Race session not found", "manual_entry_required": True}
            
            session_key = race_session.get("session_key")
            
            # Get position data
            positions_resp = await client.get(f"{OPENF1_API}/position", params={
                "session_key": session_key
            })
            
            if positions_resp.status_code != 200:
                return {"status": "error", "message": "Could not fetch positions", "manual_entry_required": True}
            
            positions = positions_resp.json()
            
            # Get final positions (last entry for each driver)
            final_positions = {}
            for pos in positions:
                driver_num = pos.get("driver_number")
                if driver_num:
                    final_positions[driver_num] = pos.get("position")
            
            # Sort by position to get top 10
            sorted_drivers = sorted(final_positions.items(), key=lambda x: x[1] if x[1] else 999)
            top_10_numbers = [d[0] for d in sorted_drivers[:10]]
            
            # Map driver numbers to our driver IDs
            number_to_id = {d["number"]: d["id"] for d in F1_DRIVERS_2026}
            race_top10 = [number_to_id.get(n, f"unknown_{n}") for n in top_10_numbers]
            race_winner = race_top10[0] if race_top10 else None
            
            return {
                "status": "success",
                "fetched_data": {
                    "race_winner": race_winner,
                    "race_top10": race_top10,
                    "session_key": session_key
                },
                "message": "Data fetched. Please verify and complete missing fields (quali, bonus) manually."
            }
            
    except Exception as e:
        logging.error(f"OpenF1 API error: {e}")
        return {"status": "error", "message": str(e), "manual_entry_required": True}

# ==================== NOTIFICATIONS ====================

async def create_notification(user_id: str, message: str, notif_type: str):
    notification = {
        "id": str(uuid.uuid4()), "user_id": user_id, "message": message,
        "type": notif_type, "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification

@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "All marked as read"}

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
                    await create_notification(u["id"], f"Rappel: Pronos {race['name']} ferment dans 24h!", "reminder")
                    notifications_sent += 1
    
    return {"message": f"{notifications_sent} reminders sent"}

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
    await create_notification(
        user["id"],
        f"Mission '{mission['name']}' complétée ! +{xp_reward} XP",
        "mission_complete"
    )
    
    level_up = new_level > user_data.get("level", 1)
    if level_up:
        await create_notification(user["id"], f"Niveau {new_level} atteint !", "level_up")
    
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
            await create_notification(
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
