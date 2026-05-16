"""
PRONOKIF - Race results routes.

GET  /results/{race_id}              — any authenticated user
POST /admin/results/{race_id}        — league creators (sets results + scores)
GET  /admin/races                    — league creators (calendar status)
GET  /admin/results/{race_id}        — league creators (raw stored doc)

Authorization caveat: the /admin/* endpoints here are gated on
"league creator" not on ADMIN_EMAIL. See services/results.py docstring.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services import results as results_service
from services.auth import get_current_user
from services.results import require_league_creator

router = APIRouter(tags=["results"])


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


@router.get("/results/{race_id}")
async def get_race_results(race_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Official results for a race + the caller's own prediction + points."""
    return await results_service.get_official(race_id, user)


@router.post("/admin/results/{race_id}")
async def set_race_results(
    race_id: str,
    data: RaceResultsInput,
    user: dict = Depends(require_league_creator),
) -> dict:
    """Persist official results then score every prediction for the race.

    Triggers XP increments, level-up notifications, "+N pts" notifications,
    leaderboard updates, and locks all predictions for this race.
    """
    payload = results_service.build_results_payload(data)
    processed = await results_service.set_official_and_score(race_id=race_id, results=payload, entered_by=user["id"])
    return {"message": "Results saved", "predictions_processed": processed}


@router.get("/admin/races")
async def get_admin_races(_user: dict = Depends(require_league_creator)) -> list[dict]:
    """Calendar with has_results / is_past / is_sprint flags."""
    return await results_service.list_admin_races()


@router.get("/admin/results/{race_id}")
async def get_admin_results(race_id: str, _user: dict = Depends(require_league_creator)) -> dict | None:
    """Raw stored race_results document."""
    return await results_service.get_admin_detail(race_id)
