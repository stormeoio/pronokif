"""
PRONOKIF - Custom predictions UI helpers.

Two endpoints the frontend calls to render the "custom predictions"
screens. They live under the legacy /custom-predictions/* path namespace
(not the /predictions/custom/* namespace used by the create/answer
endpoints in routes/predictions.py). Reconciling the two namespaces is
post-S1 work — keep the paths exact here so the SPA does not break.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from config import db
from services.auth import get_current_user

router = APIRouter(tags=["custom-predictions"])


@router.get("/custom-predictions/my-created")
async def get_my_created_custom_predictions(user=Depends(get_current_user)):
    """List custom predictions the caller has authored."""
    return await db.custom_predictions.find({"created_by": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@router.get("/custom-predictions/to-answer/{league_id}/{race_id}")
async def get_custom_predictions_to_answer(league_id: str, race_id: str, user=Depends(get_current_user)):
    """List custom predictions for a league/race with the caller's answer status."""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league.get("members", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this league",
        )

    predictions = await db.custom_predictions.find({"league_id": league_id, "race_id": race_id}, {"_id": 0}).to_list(
        100
    )

    for pred in predictions:
        answer = await db.custom_prediction_answers.find_one(
            {"prediction_id": pred["id"], "user_id": user["id"]}, {"_id": 0}
        )
        pred["user_answer"] = answer.get("answer") if answer else None
        pred["has_answered"] = answer is not None

    return predictions
