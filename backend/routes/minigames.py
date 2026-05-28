"""
PRONOKIF - Minigame Routes
/minigames/* endpoints for Reaction Time and Batak games
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import db
from services.auth import get_current_user

router = APIRouter(prefix="/minigames", tags=["Mini-Games"])


# ==================== MODELS ====================


class MinigameResultCreate(BaseModel):
    game_type: str  # "reaction" or "batak"
    score: float
    league_id: str
    race_id: str
    is_training: bool = True


class MinigameLeaderboardEntry(BaseModel):
    user_id: str
    username: str
    avatar_id: str | None = None
    best_score: float
    attempts_used: int
    position: int


class ReactionResultCreate(BaseModel):
    race_id: str
    league_id: str
    reaction_time_ms: int
    is_training: bool = False


class BatakResultCreate(BaseModel):
    race_id: str
    league_id: str
    score: int
    time_seconds: int | None = None
    is_training: bool = False


# ==================== ENDPOINTS ====================


@router.post("/result")
async def save_minigame_result(data: MinigameResultCreate, user: dict = Depends(get_current_user)) -> dict:
    """Save a mini-game result"""
    if data.game_type not in ["reaction", "batak"]:
        raise HTTPException(status_code=400, detail="Type de jeu invalide")

    league = await db.leagues.find_one({"id": data.league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Tu ne fais pas partie de cette ligue")

    # Check attempt limit (3 per competition mode)
    if not data.is_training:
        existing_attempts = await db.minigame_results.count_documents(
            {
                "user_id": user["id"],
                "league_id": data.league_id,
                "race_id": data.race_id,
                "game_type": data.game_type,
                "is_training": False,
            }
        )
        if existing_attempts >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 tentatives atteint pour ce week-end de course")

    result_id = str(uuid.uuid4())
    result = {
        "id": result_id,
        "user_id": user["id"],
        "game_type": data.game_type,
        "score": data.score,
        "league_id": data.league_id,
        "race_id": data.race_id,
        "is_training": data.is_training,
        "created_at": datetime.now(UTC).isoformat(),
    }

    await db.minigame_results.insert_one(result)

    # Update user stats for best score (global tracking)
    stats = await db.user_stats.find_one({"user_id": user["id"]}, {"_id": 0})
    if stats:
        if data.game_type == "reaction":
            current_best = stats.get("best_reaction_time")
            if current_best is None or data.score < current_best:
                await db.user_stats.update_one({"user_id": user["id"]}, {"$set": {"best_reaction_time": data.score}})
        else:
            current_best = stats.get("best_batak_score")
            if current_best is None or data.score > current_best:
                await db.user_stats.update_one({"user_id": user["id"]}, {"$set": {"best_batak_score": int(data.score)}})

        # Increment games played
        stat_key = "reaction_games_played" if data.game_type == "reaction" else "batak_games_played"
        await db.user_stats.update_one({"user_id": user["id"]}, {"$inc": {stat_key: 1}})

    return {
        "message": "Résultat enregistré",
        "result_id": result_id,
        "score": data.score,
        "is_training": data.is_training,
    }


@router.post("/reaction")
async def save_reaction_result(data: ReactionResultCreate, user: dict = Depends(get_current_user)) -> dict:
    """Frontend-compatible endpoint for reaction results."""
    payload = MinigameResultCreate(
        game_type="reaction",
        score=data.reaction_time_ms,
        league_id=data.league_id,
        race_id=data.race_id,
        is_training=data.is_training,
    )
    return await save_minigame_result(payload, user)


@router.post("/batak")
async def save_batak_result(data: BatakResultCreate, user: dict = Depends(get_current_user)) -> dict:
    """Frontend-compatible endpoint for batak results."""
    payload = MinigameResultCreate(
        game_type="batak",
        score=data.score,
        league_id=data.league_id,
        race_id=data.race_id,
        is_training=data.is_training,
    )
    result = await save_minigame_result(payload, user)
    result["time_seconds"] = data.time_seconds
    return result


@router.get("/leaderboard/{game_type}/{league_id}/{race_id}")
async def get_minigame_leaderboard(
    game_type: str, league_id: str, race_id: str, user: dict = Depends(get_current_user)
) -> dict:
    """Get mini-game leaderboard for a specific race weekend"""
    if game_type not in ["reaction", "batak"]:
        raise HTTPException(status_code=400, detail="Type de jeu invalide")

    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Tu ne fais pas partie de cette ligue")

    results = await db.minigame_results.find(
        {"league_id": league_id, "race_id": race_id, "game_type": game_type, "is_training": False}, {"_id": 0}
    ).to_list(1000)

    user_best = {}
    user_attempts = {}
    for r in results:
        uid = r["user_id"]
        score = r["score"]

        user_attempts[uid] = user_attempts.get(uid, 0) + 1

        if uid not in user_best:
            user_best[uid] = score
        else:
            if game_type == "reaction":
                user_best[uid] = min(user_best[uid], score)
            else:
                user_best[uid] = max(user_best[uid], score)

    leaderboard_data = []
    for uid, best_score in user_best.items():
        user_data = await db.users.find_one({"id": uid}, {"_id": 0})
        if user_data:
            leaderboard_data.append(
                {
                    "user_id": uid,
                    "username": user_data.get("username", "Anonymous"),
                    "avatar_id": user_data.get("avatar_id"),
                    "best_score": best_score,
                    "attempts_used": user_attempts.get(uid, 0),
                }
            )

    if game_type == "reaction":
        leaderboard_data.sort(key=lambda x: x["best_score"])
    else:
        leaderboard_data.sort(key=lambda x: x["best_score"], reverse=True)

    result = []
    for i, entry in enumerate(leaderboard_data):
        entry["position"] = i + 1
        result.append(MinigameLeaderboardEntry(**entry))

    return {"leaderboard": result, "game_type": game_type, "race_id": race_id, "league_id": league_id}


@router.get("/attempts/{game_type}/{league_id}/{race_id}")
async def get_my_minigame_attempts(
    game_type: str, league_id: str, race_id: str, user: dict = Depends(get_current_user)
) -> dict:
    """Get user's attempts for a specific mini-game"""
    results = await db.minigame_results.find(
        {
            "user_id": user["id"],
            "league_id": league_id,
            "race_id": race_id,
            "game_type": game_type,
            "is_training": False,
        },
        {"_id": 0},
    ).to_list(10)

    return {"attempts": results, "attempts_used": len(results), "attempts_remaining": max(0, 3 - len(results))}


@router.get("/global-leaderboard/{game_type}")
async def get_global_minigame_leaderboard(game_type: str, user: dict = Depends(get_current_user)) -> dict:
    """Get global mini-game leaderboard (all time best scores)"""
    if game_type not in ["reaction", "batak"]:
        raise HTTPException(status_code=400, detail="Type de jeu invalide")

    stat_field = "best_reaction_time" if game_type == "reaction" else "best_batak_score"

    stats = await db.user_stats.find({stat_field: {"$ne": None}}, {"_id": 0}).to_list(10000)

    leaderboard_data = []
    for s in stats:
        user_data = await db.users.find_one({"id": s["user_id"]}, {"_id": 0})
        if user_data and user_data.get("username"):
            leaderboard_data.append(
                {
                    "user_id": s["user_id"],
                    "username": user_data.get("username", "Anonymous"),
                    "avatar_id": user_data.get("avatar_id"),
                    "best_score": s[stat_field],
                    "attempts_used": 0,
                }
            )

    if game_type == "reaction":
        leaderboard_data.sort(key=lambda x: x["best_score"])
    else:
        leaderboard_data.sort(key=lambda x: x["best_score"], reverse=True)

    result = []
    for i, entry in enumerate(leaderboard_data[:100]):
        entry["position"] = i + 1
        result.append(MinigameLeaderboardEntry(**entry))

    return {"leaderboard": result, "game_type": game_type}
