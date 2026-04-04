"""
PRONOKIF - Configuration Module
Database connection, JWT settings, API URLs, and constants
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'pronokif-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

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
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
