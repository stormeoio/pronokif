"""
PRONOKIF Extended Features Module
- Avatars System
- Missions & Achievements
- Global Leaderboard
- Mini-games (Reaction & Batak)

Data constants split into data/avatars.py and data/missions.py (R-001).
"""

from pydantic import BaseModel

from data.avatars import ALL_AVATARS, DEFAULT_AVATARS, DRIVER_AVATARS, TEAM_AVATARS
from data.missions import MISSIONS

# Re-export for backward compatibility
__all__ = [
    "ALL_AVATARS",
    "DEFAULT_AVATARS",
    "TEAM_AVATARS",
    "DRIVER_AVATARS",
    "MISSIONS",
    "XP_REWARDS",
    "get_xp_for_level",
    "get_level_from_xp",
    "get_default_user_stats",
    "check_mission_completion",
    "get_user_mission_progress",
]

# ==================== XP & LEVELS SYSTEM ====================


def get_xp_for_level(level: int) -> int:
    """Calculate XP needed to reach a specific level"""
    if level <= 1:
        return 0
    # Formula: 100 * level^1.5
    return int(100 * (level**1.5))


def get_level_from_xp(xp: int) -> int:
    """Calculate level from total XP"""
    level = 1
    while get_xp_for_level(level + 1) <= xp:
        level += 1
    return level


# XP rewards
XP_REWARDS = {
    "prediction_made": 10,
    "prediction_complete_weekend": 25,
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


# ==================== PYDANTIC MODELS ====================


class AvatarUpdate(BaseModel):
    avatar_id: str | None = None
    custom_avatar_url: str | None = None


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
    best_reaction_time: int | None = None
    best_batak_score: int | None = None


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
    avatar_id: str | None = None
    total_points: int
    level: int
    position: int


class RaceWeekendLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: str | None = None
    race_points: int
    position: int


class ReactionGameResult(BaseModel):
    race_id: str
    league_id: str
    reaction_time_ms: int
    is_training: bool = False


class BatakGameResult(BaseModel):
    race_id: str
    league_id: str
    score: int
    time_seconds: int
    is_training: bool = False


class MinigameLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: str | None = None
    best_score: int
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
        "best_batak_score": None,
    }


def check_mission_completion(stats: dict, mission: dict) -> bool:
    """Check if a mission is completed based on user stats"""
    stat_value = stats.get(mission["stat"], 0)
    return stat_value >= mission["target"]


def get_user_mission_progress(stats: dict) -> list[dict]:
    """Get progress for all missions based on user stats"""
    progress = []
    for mission in MISSIONS:
        current = stats.get(mission["stat"], 0)
        progress.append(
            {
                "mission_id": mission["id"],
                "name": mission["name"],
                "description": mission["description"],
                "category": mission["category"],
                "current": min(current, mission["target"]),
                "target": mission["target"],
                "completed": current >= mission["target"],
                "xp_reward": mission["xp_reward"],
                "icon": mission["icon"],
            }
        )
    return progress
