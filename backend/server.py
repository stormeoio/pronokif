from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'f1-paddock-predictor-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI(title="F1 Paddock Predictor API")
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

class PredictionCreate(BaseModel):
    race_id: str
    quali_pole: str
    quali_top3: List[str]
    race_winner: str
    race_top3: List[str]

class PredictionResponse(BaseModel):
    id: str
    user_id: str
    race_id: str
    quali_pole: str
    quali_top3: List[str]
    race_winner: str
    race_top3: List[str]
    locked: bool
    created_at: str
    updated_at: str

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
    predictions_close_at: str
    status: str  # upcoming, quali_open, race_open, finished
    results: Optional[dict] = None

class DriverResponse(BaseModel):
    id: str
    name: str
    team: str
    number: int
    country: str

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
    payload = {
        "sub": user_id,
        "exp": expiration,
        "iat": datetime.now(timezone.utc)
    }
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

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "username": None,
        "current_league_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            username=None,
            created_at=user["created_at"],
            current_league_id=None
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user.get("username"),
            created_at=user["created_at"],
            current_league_id=user.get("current_league_id")
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user.get("username"),
        created_at=user["created_at"],
        current_league_id=user.get("current_league_id")
    )

@api_router.post("/auth/username", response_model=UserResponse)
async def set_username(data: UserSetUsername, user=Depends(get_current_user)):
    existing = await db.users.find_one({"username": data.username, "id": {"$ne": user["id"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"username": data.username}})
    user["username"] = data.username
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=data.username,
        created_at=user["created_at"],
        current_league_id=user.get("current_league_id")
    )

# ==================== LEAGUE ENDPOINTS ====================

@api_router.post("/leagues", response_model=LeagueResponse)
async def create_league(data: LeagueCreate, user=Depends(get_current_user)):
    league_id = str(uuid.uuid4())
    code = generate_league_code()
    
    # Ensure unique code
    while await db.leagues.find_one({"code": code}):
        code = generate_league_code()
    
    league = {
        "id": league_id,
        "name": data.name,
        "code": code,
        "created_by": user["id"],
        "members": [user["id"]],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leagues.insert_one(league)
    
    # Update user's current league
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    
    # Initialize leaderboard entry
    await db.leaderboard.insert_one({
        "id": str(uuid.uuid4()),
        "league_id": league_id,
        "user_id": user["id"],
        "total_points": 0,
        "last_race_points": 0,
        "previous_position": 1
    })
    
    return LeagueResponse(**{k: v for k, v in league.items() if k != "_id"})

@api_router.post("/leagues/join", response_model=LeagueResponse)
async def join_league(data: LeagueJoin, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"code": data.code.upper()}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    if user["id"] in league["members"]:
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.leagues.update_one(
        {"id": league["id"]},
        {"$push": {"members": user["id"]}}
    )
    
    # Update user's current league
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league["id"]}})
    
    # Initialize leaderboard entry
    member_count = len(league["members"]) + 1
    await db.leaderboard.insert_one({
        "id": str(uuid.uuid4()),
        "league_id": league["id"],
        "user_id": user["id"],
        "total_points": 0,
        "last_race_points": 0,
        "previous_position": member_count
    })
    
    league["members"].append(user["id"])
    return LeagueResponse(**league)

@api_router.get("/leagues/my", response_model=List[LeagueResponse])
async def get_my_leagues(user=Depends(get_current_user)):
    leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    return [LeagueResponse(**l) for l in leagues]

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
        
        result.append(LeaderboardEntry(
            user_id=entry["user_id"],
            username=user_data.get("username", "Anonymous") if user_data else "Anonymous",
            total_points=entry["total_points"],
            last_race_points=entry.get("last_race_points", 0),
            position=position,
            position_change=position_change
        ))
    
    return result

@api_router.post("/leagues/{league_id}/select")
async def select_league(league_id: str, user=Depends(get_current_user)):
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member")
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    return {"message": "League selected", "league_id": league_id}

# ==================== RACE & DRIVER ENDPOINTS ====================

# F1 2025 Season Data (Static fallback)
F1_DRIVERS_2025 = [
    {"id": "verstappen", "name": "Max Verstappen", "team": "Red Bull Racing", "number": 1, "country": "NED"},
    {"id": "perez", "name": "Sergio Pérez", "team": "Red Bull Racing", "number": 11, "country": "MEX"},
    {"id": "hamilton", "name": "Lewis Hamilton", "team": "Ferrari", "number": 44, "country": "GBR"},
    {"id": "leclerc", "name": "Charles Leclerc", "team": "Ferrari", "number": 16, "country": "MON"},
    {"id": "norris", "name": "Lando Norris", "team": "McLaren", "number": 4, "country": "GBR"},
    {"id": "piastri", "name": "Oscar Piastri", "team": "McLaren", "number": 81, "country": "AUS"},
    {"id": "russell", "name": "George Russell", "team": "Mercedes", "number": 63, "country": "GBR"},
    {"id": "antonelli", "name": "Kimi Antonelli", "team": "Mercedes", "number": 12, "country": "ITA"},
    {"id": "alonso", "name": "Fernando Alonso", "team": "Aston Martin", "number": 14, "country": "ESP"},
    {"id": "stroll", "name": "Lance Stroll", "team": "Aston Martin", "number": 18, "country": "CAN"},
    {"id": "gasly", "name": "Pierre Gasly", "team": "Alpine", "number": 10, "country": "FRA"},
    {"id": "doohan", "name": "Jack Doohan", "team": "Alpine", "number": 7, "country": "AUS"},
    {"id": "albon", "name": "Alexander Albon", "team": "Williams", "number": 23, "country": "THA"},
    {"id": "sainz", "name": "Carlos Sainz", "team": "Williams", "number": 55, "country": "ESP"},
    {"id": "tsunoda", "name": "Yuki Tsunoda", "team": "RB", "number": 22, "country": "JPN"},
    {"id": "lawson", "name": "Liam Lawson", "team": "RB", "number": 30, "country": "NZL"},
    {"id": "hulkenberg", "name": "Nico Hülkenberg", "team": "Sauber", "number": 27, "country": "GER"},
    {"id": "bortoleto", "name": "Gabriel Bortoleto", "team": "Sauber", "number": 5, "country": "BRA"},
    {"id": "ocon", "name": "Esteban Ocon", "team": "Haas", "number": 31, "country": "FRA"},
    {"id": "bearman", "name": "Oliver Bearman", "team": "Haas", "number": 87, "country": "GBR"},
]

F1_RACES_2025 = [
    {"id": "australia-2025", "name": "Australian Grand Prix", "circuit": "Albert Park", "country": "Australia", "date": "2025-03-16", "quali_date": "2025-03-15"},
    {"id": "china-2025", "name": "Chinese Grand Prix", "circuit": "Shanghai", "country": "China", "date": "2025-03-23", "quali_date": "2025-03-22"},
    {"id": "japan-2025", "name": "Japanese Grand Prix", "circuit": "Suzuka", "country": "Japan", "date": "2025-04-06", "quali_date": "2025-04-05"},
    {"id": "bahrain-2025", "name": "Bahrain Grand Prix", "circuit": "Sakhir", "country": "Bahrain", "date": "2025-04-13", "quali_date": "2025-04-12"},
    {"id": "saudi-2025", "name": "Saudi Arabian Grand Prix", "circuit": "Jeddah", "country": "Saudi Arabia", "date": "2025-04-20", "quali_date": "2025-04-19"},
    {"id": "miami-2025", "name": "Miami Grand Prix", "circuit": "Miami", "country": "USA", "date": "2025-05-04", "quali_date": "2025-05-03"},
    {"id": "emilia-2025", "name": "Emilia Romagna Grand Prix", "circuit": "Imola", "country": "Italy", "date": "2025-05-18", "quali_date": "2025-05-17"},
    {"id": "monaco-2025", "name": "Monaco Grand Prix", "circuit": "Monaco", "country": "Monaco", "date": "2025-05-25", "quali_date": "2025-05-24"},
    {"id": "spain-2025", "name": "Spanish Grand Prix", "circuit": "Barcelona", "country": "Spain", "date": "2025-06-01", "quali_date": "2025-05-31"},
    {"id": "canada-2025", "name": "Canadian Grand Prix", "circuit": "Montreal", "country": "Canada", "date": "2025-06-15", "quali_date": "2025-06-14"},
    {"id": "austria-2025", "name": "Austrian Grand Prix", "circuit": "Red Bull Ring", "country": "Austria", "date": "2025-06-29", "quali_date": "2025-06-28"},
    {"id": "silverstone-2025", "name": "British Grand Prix", "circuit": "Silverstone", "country": "UK", "date": "2025-07-06", "quali_date": "2025-07-05"},
    {"id": "belgium-2025", "name": "Belgian Grand Prix", "circuit": "Spa-Francorchamps", "country": "Belgium", "date": "2025-07-27", "quali_date": "2025-07-26"},
    {"id": "hungary-2025", "name": "Hungarian Grand Prix", "circuit": "Hungaroring", "country": "Hungary", "date": "2025-08-03", "quali_date": "2025-08-02"},
    {"id": "netherlands-2025", "name": "Dutch Grand Prix", "circuit": "Zandvoort", "country": "Netherlands", "date": "2025-08-31", "quali_date": "2025-08-30"},
    {"id": "monza-2025", "name": "Italian Grand Prix", "circuit": "Monza", "country": "Italy", "date": "2025-09-07", "quali_date": "2025-09-06"},
    {"id": "azerbaijan-2025", "name": "Azerbaijan Grand Prix", "circuit": "Baku", "country": "Azerbaijan", "date": "2025-09-21", "quali_date": "2025-09-20"},
    {"id": "singapore-2025", "name": "Singapore Grand Prix", "circuit": "Marina Bay", "country": "Singapore", "date": "2025-10-05", "quali_date": "2025-10-04"},
    {"id": "austin-2025", "name": "US Grand Prix", "circuit": "COTA", "country": "USA", "date": "2025-10-19", "quali_date": "2025-10-18"},
    {"id": "mexico-2025", "name": "Mexico City Grand Prix", "circuit": "Hermanos Rodríguez", "country": "Mexico", "date": "2025-10-26", "quali_date": "2025-10-25"},
    {"id": "brazil-2025", "name": "São Paulo Grand Prix", "circuit": "Interlagos", "country": "Brazil", "date": "2025-11-09", "quali_date": "2025-11-08"},
    {"id": "vegas-2025", "name": "Las Vegas Grand Prix", "circuit": "Las Vegas", "country": "USA", "date": "2025-11-22", "quali_date": "2025-11-21"},
    {"id": "qatar-2025", "name": "Qatar Grand Prix", "circuit": "Lusail", "country": "Qatar", "date": "2025-11-30", "quali_date": "2025-11-29"},
    {"id": "abudhabi-2025", "name": "Abu Dhabi Grand Prix", "circuit": "Yas Marina", "country": "UAE", "date": "2025-12-07", "quali_date": "2025-12-06"},
]

@api_router.get("/drivers", response_model=List[DriverResponse])
async def get_drivers():
    return [DriverResponse(**d) for d in F1_DRIVERS_2025]

@api_router.get("/races", response_model=List[RaceResponse])
async def get_races():
    now = datetime.now(timezone.utc)
    races = []
    
    for race in F1_RACES_2025:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        
        # Determine status
        if now < predictions_close:
            status = "upcoming"
        elif now < quali_date:
            status = "quali_open"
        elif now < race_date:
            status = "race_open"
        else:
            status = "finished"
        
        # Check for results in DB
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0})
        
        races.append(RaceResponse(
            id=race["id"],
            name=race["name"],
            circuit=race["circuit"],
            country=race["country"],
            date=race_date.isoformat(),
            quali_date=quali_date.isoformat(),
            predictions_close_at=predictions_close.isoformat(),
            status=status,
            results=result_doc.get("results") if result_doc else None
        ))
    
    return races

@api_router.get("/races/next", response_model=RaceResponse)
async def get_next_race():
    now = datetime.now(timezone.utc)
    
    for race in F1_RACES_2025:
        race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
        quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
        predictions_close = quali_date - timedelta(hours=1)
        
        if now < race_date:
            status = "upcoming" if now < predictions_close else ("quali_open" if now < quali_date else "race_open")
            
            return RaceResponse(
                id=race["id"],
                name=race["name"],
                circuit=race["circuit"],
                country=race["country"],
                date=race_date.isoformat(),
                quali_date=quali_date.isoformat(),
                predictions_close_at=predictions_close.isoformat(),
                status=status,
                results=None
            )
    
    # Return last race if all finished
    race = F1_RACES_2025[-1]
    return RaceResponse(
        id=race["id"],
        name=race["name"],
        circuit=race["circuit"],
        country=race["country"],
        date=race["date"] + "T15:00:00+00:00",
        quali_date=race["quali_date"] + "T14:00:00+00:00",
        predictions_close_at=race["quali_date"] + "T13:00:00+00:00",
        status="finished",
        results=None
    )

@api_router.get("/races/{race_id}", response_model=RaceResponse)
async def get_race(race_id: str):
    for race in F1_RACES_2025:
        if race["id"] == race_id:
            now = datetime.now(timezone.utc)
            race_date = datetime.fromisoformat(race["date"] + "T15:00:00+00:00")
            quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
            predictions_close = quali_date - timedelta(hours=1)
            
            if now < predictions_close:
                status = "upcoming"
            elif now < quali_date:
                status = "quali_open"
            elif now < race_date:
                status = "race_open"
            else:
                status = "finished"
            
            result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
            
            return RaceResponse(
                id=race["id"],
                name=race["name"],
                circuit=race["circuit"],
                country=race["country"],
                date=race_date.isoformat(),
                quali_date=quali_date.isoformat(),
                predictions_close_at=predictions_close.isoformat(),
                status=status,
                results=result_doc.get("results") if result_doc else None
            )
    
    raise HTTPException(status_code=404, detail="Race not found")

# ==================== PREDICTION ENDPOINTS ====================

@api_router.post("/predictions", response_model=PredictionResponse)
async def create_prediction(data: PredictionCreate, user=Depends(get_current_user)):
    # Check if race exists and predictions are still open
    race = None
    for r in F1_RACES_2025:
        if r["id"] == data.race_id:
            race = r
            break
    
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    
    quali_date = datetime.fromisoformat(race["quali_date"] + "T14:00:00+00:00")
    predictions_close = quali_date - timedelta(hours=1)
    
    if datetime.now(timezone.utc) > predictions_close:
        raise HTTPException(status_code=400, detail="Predictions are closed for this race")
    
    # Validate Top 3 has exactly 3 drivers
    if len(data.quali_top3) != 3 or len(data.race_top3) != 3:
        raise HTTPException(status_code=400, detail="Top 3 must have exactly 3 drivers")
    
    # Check for existing prediction
    existing = await db.predictions.find_one({
        "user_id": user["id"],
        "race_id": data.race_id
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing
        await db.predictions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "quali_pole": data.quali_pole,
                "quali_top3": data.quali_top3,
                "race_winner": data.race_winner,
                "race_top3": data.race_top3,
                "updated_at": now
            }}
        )
        return PredictionResponse(
            id=existing["id"],
            user_id=user["id"],
            race_id=data.race_id,
            quali_pole=data.quali_pole,
            quali_top3=data.quali_top3,
            race_winner=data.race_winner,
            race_top3=data.race_top3,
            locked=False,
            created_at=existing["created_at"],
            updated_at=now
        )
    
    # Create new prediction
    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        "quali_pole": data.quali_pole,
        "quali_top3": data.quali_top3,
        "race_winner": data.race_winner,
        "race_top3": data.race_top3,
        "locked": False,
        "created_at": now,
        "updated_at": now
    }
    await db.predictions.insert_one(prediction)
    
    return PredictionResponse(**{k: v for k, v in prediction.items() if k != "_id"})

@api_router.get("/predictions/race/{race_id}", response_model=Optional[PredictionResponse])
async def get_my_prediction(race_id: str, user=Depends(get_current_user)):
    prediction = await db.predictions.find_one({
        "user_id": user["id"],
        "race_id": race_id
    }, {"_id": 0})
    
    if not prediction:
        return None
    
    return PredictionResponse(**prediction)

@api_router.get("/predictions/history", response_model=List[PredictionResponse])
async def get_prediction_history(user=Depends(get_current_user)):
    predictions = await db.predictions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [PredictionResponse(**p) for p in predictions]

# ==================== RESULTS & SCORING ====================

SCORING_RULES = {
    "quali_pole_exact": 5,
    "quali_top3_exact_position": 3,
    "quali_top3_in_top3": 1,
    "race_winner_exact": 10,
    "race_top3_exact_position": 5,
    "race_top3_in_top3": 2,
}

def calculate_points(prediction: dict, results: dict) -> dict:
    points = {
        "quali_pole": 0,
        "quali_top3": 0,
        "race_winner": 0,
        "race_top3": 0,
        "total": 0,
        "details": []
    }
    
    # Quali Pole
    if prediction["quali_pole"] == results.get("quali_pole"):
        points["quali_pole"] = SCORING_RULES["quali_pole_exact"]
        points["details"].append(f"Pole position exacte: +{SCORING_RULES['quali_pole_exact']}")
    
    # Quali Top 3
    actual_quali_top3 = results.get("quali_top3", [])
    for i, driver in enumerate(prediction["quali_top3"]):
        if i < len(actual_quali_top3) and driver == actual_quali_top3[i]:
            points["quali_top3"] += SCORING_RULES["quali_top3_exact_position"]
            points["details"].append(f"Quali P{i+1} exact: +{SCORING_RULES['quali_top3_exact_position']}")
        elif driver in actual_quali_top3:
            points["quali_top3"] += SCORING_RULES["quali_top3_in_top3"]
            points["details"].append(f"Quali {driver} dans Top 3: +{SCORING_RULES['quali_top3_in_top3']}")
    
    # Race Winner
    if prediction["race_winner"] == results.get("race_winner"):
        points["race_winner"] = SCORING_RULES["race_winner_exact"]
        points["details"].append(f"Vainqueur exact: +{SCORING_RULES['race_winner_exact']}")
    
    # Race Top 3
    actual_race_top3 = results.get("race_top3", [])
    for i, driver in enumerate(prediction["race_top3"]):
        if i < len(actual_race_top3) and driver == actual_race_top3[i]:
            points["race_top3"] += SCORING_RULES["race_top3_exact_position"]
            points["details"].append(f"Course P{i+1} exact: +{SCORING_RULES['race_top3_exact_position']}")
        elif driver in actual_race_top3:
            points["race_top3"] += SCORING_RULES["race_top3_in_top3"]
            points["details"].append(f"Course {driver} dans Top 3: +{SCORING_RULES['race_top3_in_top3']}")
    
    points["total"] = points["quali_pole"] + points["quali_top3"] + points["race_winner"] + points["race_top3"]
    return points

@api_router.get("/results/{race_id}")
async def get_race_results(race_id: str, user=Depends(get_current_user)):
    result = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Results not available yet")
    
    # Get user's prediction
    prediction = await db.predictions.find_one({
        "user_id": user["id"],
        "race_id": race_id
    }, {"_id": 0})
    
    points = None
    if prediction:
        points = calculate_points(prediction, result["results"])
    
    return {
        "results": result["results"],
        "prediction": prediction,
        "points": points
    }

# Admin endpoint to set results (for testing/demo)
@api_router.post("/admin/results/{race_id}")
async def set_race_results(race_id: str, results: dict, user=Depends(get_current_user)):
    await db.race_results.update_one(
        {"race_id": race_id},
        {"$set": {"race_id": race_id, "results": results}},
        upsert=True
    )
    
    # Calculate points for all predictions
    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
    
    for pred in predictions:
        points = calculate_points(pred, results)
        
        # Update user's points in all their leagues
        user_data = await db.users.find_one({"id": pred["user_id"]}, {"_id": 0})
        if user_data:
            leagues = await db.leagues.find({"members": pred["user_id"]}, {"_id": 0}).to_list(100)
            for league in leagues:
                # Get current leaderboard entry
                entry = await db.leaderboard.find_one({
                    "league_id": league["id"],
                    "user_id": pred["user_id"]
                })
                
                if entry:
                    # Store previous position before update
                    all_entries = await db.leaderboard.find({"league_id": league["id"]}, {"_id": 0}).to_list(100)
                    all_entries.sort(key=lambda x: x["total_points"], reverse=True)
                    current_pos = next((i+1 for i, e in enumerate(all_entries) if e["user_id"] == pred["user_id"]), len(all_entries))
                    
                    await db.leaderboard.update_one(
                        {"id": entry["id"]},
                        {
                            "$inc": {"total_points": points["total"]},
                            "$set": {
                                "last_race_points": points["total"],
                                "previous_position": current_pos
                            }
                        }
                    )
    
    # Lock all predictions for this race
    await db.predictions.update_many(
        {"race_id": race_id},
        {"$set": {"locked": True}}
    )
    
    return {"message": "Results saved and points calculated"}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user=Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [NotificationResponse(**n) for n in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
