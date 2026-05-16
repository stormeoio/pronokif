"""
PRONOKIF - Leaderboard routes.

GET /leaderboard/global              — top players across all leagues
GET /leaderboard/race/{race_id}      — single race weekend ranking

Mounted by server.py under prefix="/api". Auth required.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends

from features import GlobalLeaderboardEntry, RaceWeekendLeaderboardEntry
from services import leaderboards as leaderboards_service
from services.auth import get_current_user


router = APIRouter(tags=["leaderboards"])


@router.get("/leaderboard/global")
async def get_global_leaderboard(limit: int = 100, user=Depends(get_current_user)):
    """Top ``limit`` players ranked by total points across all leagues."""
    data = await leaderboards_service.build_global(
        current_user_id=user["id"], limit=limit
    )
    data["leaderboard"] = [GlobalLeaderboardEntry(**e) for e in data["leaderboard"]]
    return data


@router.get("/leaderboard/race/{race_id}")
async def get_race_weekend_leaderboard(
    race_id: str,
    league_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    """Per-race weekend leaderboard, optionally scoped to a league."""
    data = await leaderboards_service.build_race_weekend(
        race_id=race_id, league_id=league_id
    )
    if data.get("leaderboard"):
        data["leaderboard"] = [
            RaceWeekendLeaderboardEntry(**e) for e in data["leaderboard"]
        ]
    return data
