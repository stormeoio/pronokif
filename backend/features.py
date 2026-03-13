"""
PRONOKIF Extended Features Module
- Avatars System
- Missions & Achievements
- Global Leaderboard
- Mini-games (Reaction & Batak)
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import random

# ==================== AVATAR SYSTEM ====================

# Default avatars - Classic icons
DEFAULT_AVATARS = [
    # Animals
    {"id": "avatar_wolf", "name": "Loup", "category": "animals", "icon": "wolf"},
    {"id": "avatar_eagle", "name": "Aigle", "category": "animals", "icon": "eagle"},
    {"id": "avatar_lion", "name": "Lion", "category": "animals", "icon": "lion"},
    {"id": "avatar_shark", "name": "Requin", "category": "animals", "icon": "shark"},
    {"id": "avatar_phoenix", "name": "Phoenix", "category": "animals", "icon": "phoenix"},
    # Gaming
    {"id": "avatar_controller", "name": "Gamer", "category": "gaming", "icon": "gamepad"},
    {"id": "avatar_trophy", "name": "Champion", "category": "gaming", "icon": "trophy"},
    {"id": "avatar_star", "name": "Star", "category": "gaming", "icon": "star"},
    {"id": "avatar_crown", "name": "King", "category": "gaming", "icon": "crown"},
    {"id": "avatar_rocket", "name": "Rocket", "category": "gaming", "icon": "rocket"},
    # Abstract
    {"id": "avatar_fire", "name": "Fire", "category": "abstract", "icon": "flame"},
    {"id": "avatar_bolt", "name": "Eclair", "category": "abstract", "icon": "zap"},
    {"id": "avatar_target", "name": "Target", "category": "abstract", "icon": "target"},
    {"id": "avatar_shield", "name": "Shield", "category": "abstract", "icon": "shield"},
    {"id": "avatar_gem", "name": "Gem", "category": "abstract", "icon": "gem"},
]

# Team-inspired avatars (stylized, not official logos)
TEAM_AVATARS = [
    {"id": "team_redbull", "name": "Taureau Bleu", "category": "teams", "colors": ["#3671C6", "#1E3A6E"], "team": "Red Bull Racing"},
    {"id": "team_ferrari", "name": "Cavallino", "category": "teams", "colors": ["#F91536", "#7B0A1A"], "team": "Ferrari"},
    {"id": "team_mclaren", "name": "Papaye", "category": "teams", "colors": ["#FF8000", "#47C7FC"], "team": "McLaren"},
    {"id": "team_mercedes", "name": "Flèches d'Argent", "category": "teams", "colors": ["#27F4D2", "#000000"], "team": "Mercedes"},
    {"id": "team_astonmartin", "name": "Racing Green", "category": "teams", "colors": ["#229971", "#0D3B2D"], "team": "Aston Martin"},
    {"id": "team_alpine", "name": "Bleu Alpine", "category": "teams", "colors": ["#0093CC", "#FF69B4"], "team": "Alpine"},
    {"id": "team_williams", "name": "Grove Blue", "category": "teams", "colors": ["#64C4FF", "#00205B"], "team": "Williams"},
    {"id": "team_rb", "name": "VCARB", "category": "teams", "colors": ["#6692FF", "#1E3264"], "team": "RB"},
    {"id": "team_sauber", "name": "Kick Green", "category": "teams", "colors": ["#52E252", "#000000"], "team": "Sauber"},
    {"id": "team_haas", "name": "Stars & Stripes", "category": "teams", "colors": ["#B6BABD", "#FFFFFF"], "team": "Haas"},
]

# Driver silhouette avatars (with helmet number)
DRIVER_AVATARS = [
    {"id": "driver_1", "name": "#1 Verstappen", "category": "drivers", "number": 1, "colors": ["#3671C6", "#FFD700"]},
    {"id": "driver_30", "name": "#30 Lawson", "category": "drivers", "number": 30, "colors": ["#3671C6", "#FFFFFF"]},
    {"id": "driver_44", "name": "#44 Hamilton", "category": "drivers", "number": 44, "colors": ["#F91536", "#FFD700"]},
    {"id": "driver_16", "name": "#16 Leclerc", "category": "drivers", "number": 16, "colors": ["#F91536", "#FFFFFF"]},
    {"id": "driver_4", "name": "#4 Norris", "category": "drivers", "number": 4, "colors": ["#FF8000", "#47C7FC"]},
    {"id": "driver_81", "name": "#81 Piastri", "category": "drivers", "number": 81, "colors": ["#FF8000", "#FFFFFF"]},
    {"id": "driver_63", "name": "#63 Russell", "category": "drivers", "number": 63, "colors": ["#27F4D2", "#000000"]},
    {"id": "driver_12", "name": "#12 Antonelli", "category": "drivers", "number": 12, "colors": ["#27F4D2", "#FFFFFF"]},
    {"id": "driver_14", "name": "#14 Alonso", "category": "drivers", "number": 14, "colors": ["#229971", "#FFD700"]},
    {"id": "driver_18", "name": "#18 Stroll", "category": "drivers", "number": 18, "colors": ["#229971", "#FFFFFF"]},
    {"id": "driver_10", "name": "#10 Gasly", "category": "drivers", "number": 10, "colors": ["#0093CC", "#FF69B4"]},
    {"id": "driver_7", "name": "#7 Doohan", "category": "drivers", "number": 7, "colors": ["#0093CC", "#FFFFFF"]},
    {"id": "driver_23", "name": "#23 Albon", "category": "drivers", "number": 23, "colors": ["#64C4FF", "#E10600"]},
    {"id": "driver_55", "name": "#55 Sainz", "category": "drivers", "number": 55, "colors": ["#64C4FF", "#FFFFFF"]},
    {"id": "driver_22", "name": "#22 Tsunoda", "category": "drivers", "number": 22, "colors": ["#6692FF", "#FFFFFF"]},
    {"id": "driver_6", "name": "#6 Hadjar", "category": "drivers", "number": 6, "colors": ["#6692FF", "#E10600"]},
    {"id": "driver_27", "name": "#27 Hulkenberg", "category": "drivers", "number": 27, "colors": ["#52E252", "#000000"]},
    {"id": "driver_5", "name": "#5 Bortoleto", "category": "drivers", "number": 5, "colors": ["#52E252", "#FFD700"]},
    {"id": "driver_31", "name": "#31 Ocon", "category": "drivers", "number": 31, "colors": ["#B6BABD", "#E10600"]},
    {"id": "driver_87", "name": "#87 Bearman", "category": "drivers", "number": 87, "colors": ["#B6BABD", "#000000"]},
]

ALL_AVATARS = DEFAULT_AVATARS + TEAM_AVATARS + DRIVER_AVATARS

# ==================== XP & LEVELS SYSTEM ====================

# XP required for each level (exponential growth)
def get_xp_for_level(level: int) -> int:
    """Calculate XP needed to reach a specific level"""
    if level <= 1:
        return 0
    # Formula: 100 * level^1.5
    return int(100 * (level ** 1.5))

def get_level_from_xp(xp: int) -> int:
    """Calculate level from total XP"""
    level = 1
    while get_xp_for_level(level + 1) <= xp:
        level += 1
    return level

# XP rewards
XP_REWARDS = {
    "prediction_made": 10,
    "prediction_complete_weekend": 25,  # All predictions for a race weekend
    "correct_pole": 20,
    "correct_winner": 30,
    "correct_top10_exact": 15,
    "correct_bonus": 10,
    "first_prediction_season": 50,
    "daily_login": 5,
    "league_created": 30,
    "league_joined": 20,
    "minigame_played": 5,
    "minigame_won": 25,
    "mission_completed": 0,  # Variable based on mission
}

# ==================== MISSIONS & ACHIEVEMENTS ====================

MISSIONS = [
    # Assiduity Missions
    {"id": "predictions_10", "name": "Apprenti Pronostiqueur", "description": "Réaliser 10 pronostics", "category": "assiduity", "target": 10, "stat": "predictions_made", "xp_reward": 50, "icon": "target"},
    {"id": "predictions_50", "name": "Pronostiqueur Confirmé", "description": "Réaliser 50 pronostics", "category": "assiduity", "target": 50, "stat": "predictions_made", "xp_reward": 150, "icon": "target"},
    {"id": "predictions_100", "name": "Expert en Pronostics", "description": "Réaliser 100 pronostics", "category": "assiduity", "target": 100, "stat": "predictions_made", "xp_reward": 300, "icon": "target"},
    {"id": "predictions_500", "name": "Maître Pronostiqueur", "description": "Réaliser 500 pronostics", "category": "assiduity", "target": 500, "stat": "predictions_made", "xp_reward": 750, "icon": "trophy"},
    {"id": "predictions_1000", "name": "Légende", "description": "Réaliser 1000 pronostics", "category": "assiduity", "target": 1000, "stat": "predictions_made", "xp_reward": 1500, "icon": "crown"},
    
    {"id": "weekends_complete_5", "name": "Weekend Warrior", "description": "Compléter tous les pronos de 5 weekends", "category": "assiduity", "target": 5, "stat": "weekends_complete", "xp_reward": 100, "icon": "calendar"},
    {"id": "weekends_complete_15", "name": "Assidu", "description": "Compléter tous les pronos de 15 weekends", "category": "assiduity", "target": 15, "stat": "weekends_complete", "xp_reward": 300, "icon": "calendar"},
    {"id": "weekends_complete_25", "name": "Saison Complète", "description": "Compléter tous les pronos de 25 weekends", "category": "assiduity", "target": 25, "stat": "weekends_complete", "xp_reward": 1000, "icon": "flag"},
    
    # Performance Missions - Pole Position
    {"id": "pole_correct_1", "name": "Premier Pole", "description": "Trouver la pole position 1 fois", "category": "performance", "target": 1, "stat": "poles_correct", "xp_reward": 25, "icon": "flag"},
    {"id": "pole_correct_5", "name": "Pole Sitter", "description": "Trouver la pole position 5 fois", "category": "performance", "target": 5, "stat": "poles_correct", "xp_reward": 75, "icon": "flag"},
    {"id": "pole_correct_10", "name": "Qualif Master", "description": "Trouver la pole position 10 fois", "category": "performance", "target": 10, "stat": "poles_correct", "xp_reward": 150, "icon": "flag"},
    {"id": "pole_correct_15", "name": "Super Pole", "description": "Trouver la pole position 15 fois", "category": "performance", "target": 15, "stat": "poles_correct", "xp_reward": 300, "icon": "zap"},
    {"id": "pole_correct_25", "name": "Pole Legend", "description": "Trouver la pole position 25 fois", "category": "performance", "target": 25, "stat": "poles_correct", "xp_reward": 500, "icon": "crown"},
    
    # Performance Missions - Race Winner
    {"id": "winner_correct_1", "name": "Premier Victoire", "description": "Trouver le vainqueur 1 fois", "category": "performance", "target": 1, "stat": "winners_correct", "xp_reward": 30, "icon": "trophy"},
    {"id": "winner_correct_5", "name": "Vainqueur", "description": "Trouver le vainqueur 5 fois", "category": "performance", "target": 5, "stat": "winners_correct", "xp_reward": 100, "icon": "trophy"},
    {"id": "winner_correct_10", "name": "Race Master", "description": "Trouver le vainqueur 10 fois", "category": "performance", "target": 10, "stat": "winners_correct", "xp_reward": 200, "icon": "trophy"},
    {"id": "winner_correct_15", "name": "Champion", "description": "Trouver le vainqueur 15 fois", "category": "performance", "target": 15, "stat": "winners_correct", "xp_reward": 400, "icon": "medal"},
    {"id": "winner_correct_25", "name": "Winner Legend", "description": "Trouver le vainqueur 25 fois", "category": "performance", "target": 25, "stat": "winners_correct", "xp_reward": 750, "icon": "crown"},
    
    # Performance Missions - Total Correct Predictions
    {"id": "correct_10", "name": "En Forme", "description": "10 pronostics réussis", "category": "performance", "target": 10, "stat": "predictions_correct", "xp_reward": 50, "icon": "check"},
    {"id": "correct_50", "name": "Sur une Série", "description": "50 pronostics réussis", "category": "performance", "target": 50, "stat": "predictions_correct", "xp_reward": 200, "icon": "check"},
    {"id": "correct_100", "name": "Accuracy King", "description": "100 pronostics réussis", "category": "performance", "target": 100, "stat": "predictions_correct", "xp_reward": 500, "icon": "target"},
    {"id": "correct_500", "name": "Oracle", "description": "500 pronostics réussis", "category": "performance", "target": 500, "stat": "predictions_correct", "xp_reward": 1500, "icon": "eye"},
    
    # Bonus Missions
    {"id": "safety_car_5", "name": "Safety First", "description": "5 Safety Car corrects", "category": "performance", "target": 5, "stat": "safety_car_correct", "xp_reward": 75, "icon": "alert-triangle"},
    {"id": "fastest_lap_5", "name": "Speed Demon", "description": "5 Fastest Lap corrects", "category": "performance", "target": 5, "stat": "fastest_lap_correct", "xp_reward": 100, "icon": "zap"},
    {"id": "first_corner_5", "name": "Turn 1 Expert", "description": "5 Leader 1er virage corrects", "category": "performance", "target": 5, "stat": "first_corner_correct", "xp_reward": 100, "icon": "corner-down-right"},
    {"id": "dnf_10", "name": "Crash Predictor", "description": "10 DNF pilotes corrects", "category": "performance", "target": 10, "stat": "dnf_correct", "xp_reward": 150, "icon": "x-circle"},
    
    # Social Missions
    {"id": "leagues_joined_3", "name": "Social", "description": "Rejoindre 3 ligues", "category": "social", "target": 3, "stat": "leagues_joined", "xp_reward": 50, "icon": "users"},
    {"id": "league_created", "name": "Leader", "description": "Créer une ligue", "category": "social", "target": 1, "stat": "leagues_created", "xp_reward": 30, "icon": "plus-circle"},
    {"id": "custom_pred_5", "name": "Créatif", "description": "Créer 5 pronostics personnalisés", "category": "social", "target": 5, "stat": "custom_preds_created", "xp_reward": 75, "icon": "edit"},
    
    # Mini-game Missions
    {"id": "reaction_games_10", "name": "Réflexes", "description": "Jouer 10 parties Reaction", "category": "minigames", "target": 10, "stat": "reaction_games_played", "xp_reward": 50, "icon": "zap"},
    {"id": "reaction_win_5", "name": "Quick Start", "description": "Gagner 5 fois au Reaction", "category": "minigames", "target": 5, "stat": "reaction_wins", "xp_reward": 100, "icon": "zap"},
    {"id": "batak_games_10", "name": "Batak Lover", "description": "Jouer 10 parties Batak", "category": "minigames", "target": 10, "stat": "batak_games_played", "xp_reward": 50, "icon": "target"},
    {"id": "batak_win_5", "name": "Batak Master", "description": "Gagner 5 fois au Batak", "category": "minigames", "target": 5, "stat": "batak_wins", "xp_reward": 100, "icon": "target"},
    {"id": "reaction_sub_200", "name": "Lightning", "description": "Temps de réaction < 200ms", "category": "minigames", "target": 1, "stat": "reaction_sub_200", "xp_reward": 150, "icon": "bolt"},
    {"id": "batak_30_targets", "name": "Target Hunter", "description": "30 cibles en une partie Batak", "category": "minigames", "target": 1, "stat": "batak_30_targets", "xp_reward": 150, "icon": "target"},
]

# ==================== PYDANTIC MODELS ====================

class AvatarUpdate(BaseModel):
    avatar_id: Optional[str] = None  # Predefined avatar ID
    custom_avatar_url: Optional[str] = None  # URL for uploaded photo

class UserStats(BaseModel):
    predictions_made: int = 0
    predictions_correct: int = 0
    weekends_complete: int = 0
    poles_correct: int = 0
    winners_correct: int = 0
    safety_car_correct: int = 0
    fastest_lap_correct: int = 0
    first_corner_correct: int = 0
    dnf_correct: int = 0
    leagues_joined: int = 0
    leagues_created: int = 0
    custom_preds_created: int = 0
    reaction_games_played: int = 0
    reaction_wins: int = 0
    batak_games_played: int = 0
    batak_wins: int = 0
    reaction_sub_200: int = 0
    batak_30_targets: int = 0
    total_points: int = 0
    best_reaction_time: Optional[int] = None  # in ms
    best_batak_score: Optional[int] = None

class MissionProgress(BaseModel):
    mission_id: str
    name: str
    description: str
    category: str
    current: int
    target: int
    completed: bool
    xp_reward: int
    icon: str

class GlobalLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: Optional[str] = None
    total_points: int
    level: int
    position: int

class RaceWeekendLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: Optional[str] = None
    race_points: int
    position: int

# Mini-game models
class ReactionGameResult(BaseModel):
    race_id: str
    league_id: str
    reaction_time_ms: int  # Reaction time in milliseconds
    is_training: bool = False

class BatakGameResult(BaseModel):
    race_id: str
    league_id: str
    score: int  # Number of targets hit
    time_seconds: int  # Game duration (usually 30s)
    is_training: bool = False

class MinigameLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: Optional[str] = None
    best_score: int  # Best reaction time or best batak score
    attempts_used: int
    position: int

# ==================== HELPER FUNCTIONS ====================

def get_default_user_stats() -> dict:
    """Return default stats for a new user"""
    return {
        "predictions_made": 0,
        "predictions_correct": 0,
        "weekends_complete": 0,
        "poles_correct": 0,
        "winners_correct": 0,
        "safety_car_correct": 0,
        "fastest_lap_correct": 0,
        "first_corner_correct": 0,
        "dnf_correct": 0,
        "leagues_joined": 0,
        "leagues_created": 0,
        "custom_preds_created": 0,
        "reaction_games_played": 0,
        "reaction_wins": 0,
        "batak_games_played": 0,
        "batak_wins": 0,
        "reaction_sub_200": 0,
        "batak_30_targets": 0,
        "total_points": 0,
        "best_reaction_time": None,
        "best_batak_score": None
    }

def check_mission_completion(stats: dict, mission: dict) -> bool:
    """Check if a mission is completed based on user stats"""
    stat_value = stats.get(mission["stat"], 0)
    return stat_value >= mission["target"]

def get_user_mission_progress(stats: dict) -> List[dict]:
    """Get progress for all missions based on user stats"""
    progress = []
    for mission in MISSIONS:
        current = stats.get(mission["stat"], 0)
        progress.append({
            "mission_id": mission["id"],
            "name": mission["name"],
            "description": mission["description"],
            "category": mission["category"],
            "current": min(current, mission["target"]),
            "target": mission["target"],
            "completed": current >= mission["target"],
            "xp_reward": mission["xp_reward"],
            "icon": mission["icon"]
        })
    return progress
