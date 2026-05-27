"""
PRONOKIF - Custom predictions UI helpers.

Two endpoints the frontend calls to render the "custom predictions"
screens. They live under the legacy /custom-predictions/* path namespace
(not the /predictions/custom/* namespace used by the create/answer
endpoints in routes/predictions.py). Reconciling the two namespaces is
post-S1 work — keep the paths exact here so the SPA does not break.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from config import db
from services.auth import get_current_user

router = APIRouter(tags=["custom-predictions"])


class CustomPredictionAnswerIn(BaseModel):
    answer: Any


class SetCorrectAnswerIn(BaseModel):
    correct_answer: Any


@router.get("/custom-predictions/my-created")
async def get_my_created_custom_predictions(user: dict = Depends(get_current_user)) -> list[dict]:
    """List custom predictions the caller has authored."""
    return await db.custom_predictions.find({"created_by": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@router.get("/custom-predictions/to-answer/{league_id}/{race_id}")
async def get_custom_predictions_to_answer(
    league_id: str, race_id: str, user: dict = Depends(get_current_user)
) -> list[dict]:
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


@router.post("/custom-predictions/{prediction_id}/answer")
async def answer_custom_prediction_legacy(
    prediction_id: str, body: CustomPredictionAnswerIn, user: dict = Depends(get_current_user)
) -> dict:
    """Submit an answer through the frontend legacy path."""
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom prediction not found")

    league = await db.leagues.find_one({"id": custom_pred["league_id"]}, {"_id": 0})
    if not league or user["id"] not in league.get("members", []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this league")

    await db.custom_prediction_answers.update_one(
        {"prediction_id": prediction_id, "user_id": user["id"]},
        {
            "$set": {
                "prediction_id": prediction_id,
                "user_id": user["id"],
                "answer": body.answer,
                "answered_at": datetime.now(UTC).isoformat(),
            }
        },
        upsert=True,
    )
    return {"message": "Answer saved"}


@router.post("/custom-predictions/{prediction_id}/set-correct")
async def set_correct_answer_legacy(
    prediction_id: str, body: SetCorrectAnswerIn, user: dict = Depends(get_current_user)
) -> dict:
    """Set the correct answer through the frontend legacy path."""
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom prediction not found")
    if custom_pred["created_by"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only creator can set correct answer")

    await db.custom_predictions.update_one(
        {"id": prediction_id}, {"$set": {"correct_answer": body.correct_answer}}
    )

    answers = await db.custom_prediction_answers.find({"prediction_id": prediction_id}, {"_id": 0}).to_list(1000)
    for answer in answers:
        user_answer = answer.get("answer")
        correct = body.correct_answer
        is_correct = False

        if custom_pred.get("multiple_choice"):
            if isinstance(user_answer, list) and isinstance(correct, list):
                is_correct = any(item in correct for item in user_answer)
            elif isinstance(user_answer, list):
                is_correct = correct in user_answer
        else:
            is_correct = user_answer == correct

        if is_correct:
            await db.leaderboard.update_one(
                {"league_id": custom_pred["league_id"], "user_id": answer["user_id"]},
                {"$inc": {"total_points": 2}},
            )
            await db.users.update_one({"id": answer["user_id"]}, {"$inc": {"xp": 10}})

    return {"message": "Correct answer set and points calculated"}
