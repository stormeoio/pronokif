"""Business rules for league custom-prediction scoring."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from config import db
from services.league_membership import (
    current_leaderboard_position,
    ensure_leaderboard_entry,
    league_championship_context,
)

CUSTOM_PREDICTION_POINTS = 2
CUSTOM_PREDICTION_XP = 10


def _normalize_answer(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip().casefold()
    if isinstance(value, list):
        return [_normalize_answer(item) for item in value]
    return value


def answer_matches_correct(user_answer: Any, correct_answer: Any, *, multiple_choice: bool = False) -> bool:
    """Return whether an answer matches the official custom answer."""
    normalized_user = _normalize_answer(user_answer)
    normalized_correct = _normalize_answer(correct_answer)

    if multiple_choice:
        if isinstance(normalized_correct, list):
            correct_values = set(normalized_correct)
            if isinstance(normalized_user, list):
                return any(item in correct_values for item in normalized_user)
            return normalized_user in correct_values
        if isinstance(normalized_user, list):
            return normalized_correct in set(normalized_user)

    return normalized_user == normalized_correct


def score_custom_answer(
    answer: dict,
    *,
    correct_answer: Any,
    multiple_choice: bool = False,
) -> dict:
    is_correct = answer_matches_correct(
        answer.get("answer"),
        correct_answer,
        multiple_choice=multiple_choice,
    )
    return {
        "is_correct": is_correct,
        "points_awarded": CUSTOM_PREDICTION_POINTS if is_correct else 0,
        "xp_awarded": CUSTOM_PREDICTION_XP if is_correct else 0,
    }


async def settle_custom_prediction(custom_pred: dict, *, correct_answer: Any, scored_by: str) -> dict:
    """Persist a correct answer and apply idempotent point deltas."""
    now = datetime.now(UTC).isoformat()
    await db.custom_predictions.update_one(
        {"id": custom_pred["id"]},
        {
            "$set": {
                "correct_answer": correct_answer,
                "scored_by": scored_by,
                "scored_at": now,
            }
        },
    )

    answers = await db.custom_prediction_answers.find({"prediction_id": custom_pred["id"]}, {"_id": 0}).to_list(1000)
    league = await db.leagues.find_one({"id": custom_pred["league_id"]}, {"_id": 0})
    if not league:
        return {"answers_scored": 0, "correct_answers": 0, "points_delta": 0, "xp_delta": 0}

    answers_scored = 0
    correct_answers = 0
    total_points_delta = 0
    total_xp_delta = 0
    championship_context = league_championship_context(league)
    championship_context.update(
        {
            key: value
            for key, value in {
                "season": custom_pred.get("season"),
                "championship_id": custom_pred.get("championship_id"),
            }.items()
            if value is not None
        }
    )

    for answer in answers:
        scoring = score_custom_answer(
            answer,
            correct_answer=correct_answer,
            multiple_choice=bool(custom_pred.get("multiple_choice")),
        )
        previous_points = int(answer.get("points_awarded") or 0)
        previous_xp = int(answer.get("xp_awarded") or 0)
        points_delta = scoring["points_awarded"] - previous_points
        xp_delta = scoring["xp_awarded"] - previous_xp

        await db.custom_prediction_answers.update_one(
            {"prediction_id": custom_pred["id"], "user_id": answer["user_id"]},
            {
                "$set": {
                    **scoring,
                    **championship_context,
                    "league_id": custom_pred["league_id"],
                    "race_id": custom_pred.get("race_id"),
                    "correct_answer_snapshot": correct_answer,
                    "scored_at": now,
                }
            },
        )

        if points_delta:
            entry = await ensure_leaderboard_entry(league, answer["user_id"])
            previous_position = await current_leaderboard_position(league, answer["user_id"])
            await db.leaderboard.update_one(
                {"id": entry["id"]},
                {
                    "$inc": {
                        "total_points": points_delta,
                        "custom_prediction_points": points_delta,
                    },
                    "$set": {
                        **championship_context,
                        "previous_position": previous_position,
                        "updated_at": now,
                    },
                },
            )

        if xp_delta:
            await db.users.update_one({"id": answer["user_id"]}, {"$inc": {"xp": xp_delta}})

        answers_scored += 1
        correct_answers += 1 if scoring["is_correct"] else 0
        total_points_delta += points_delta
        total_xp_delta += xp_delta

    return {
        "answers_scored": answers_scored,
        "correct_answers": correct_answers,
        "points_delta": total_points_delta,
        "xp_delta": total_xp_delta,
    }
