"""
PRONOKIF - Prediction Routes
/predictions/* endpoints for managing user predictions
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from config import db
from data.f1_data import F1_RACES_2026
from models.schemas import (
    CustomPredictionAnswer,
    CustomPredictionCreate,
    MainPredictionCreate,
    PredictionCreate,
    SetCorrectAnswer,
    SprintPredictionCreate,
)
from services.auth import get_current_user
from services.predictions import count_individual_predictions  # re-export for backward compat
from services.scoring import calculate_points

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ==================== HELPER FUNCTIONS ====================


def get_predictions_close_time(race: dict) -> datetime:
    """Get the time when main race predictions close (15 min before Q1)"""
    quali_date = race["quali_date"]
    quali_time = race.get("quali_time", "14:00")
    quali_datetime = datetime.fromisoformat(f"{quali_date}T{quali_time}:00+00:00")
    return quali_datetime - timedelta(minutes=15)


def get_sprint_predictions_close_time(race: dict):
    """Get the time when sprint predictions close (15 min before SQ1)"""
    if not race.get("is_sprint"):
        return None
    sprint_quali_date = race.get("sprint_quali_date")
    sprint_quali_time = race.get("sprint_quali_time", "10:30")
    if sprint_quali_date:
        sq_datetime = datetime.fromisoformat(f"{sprint_quali_date}T{sprint_quali_time}:00+00:00")
        return sq_datetime - timedelta(minutes=15)
    return None


# count_individual_predictions moved to services/predictions.py (S1 lot 3 dedup).
# Re-exported above so existing in-file callers keep working unchanged.


# ==================== MAIN PREDICTION ENDPOINTS ====================


@router.post("")
async def create_prediction(data: PredictionCreate, user: dict = Depends(get_current_user)) -> dict:
    """Create or update a prediction for a race"""
    race = next((r for r in F1_RACES_2026 if r["id"] == data.race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    predictions_close = get_predictions_close_time(race)
    if datetime.now(UTC) > predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sont fermés (15 min avant les FP1)")

    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Top 10 must have exactly 10 drivers")

    if race.get("is_sprint"):
        if not data.sprint_quali_pole:
            raise HTTPException(status_code=400, detail="Sprint quali pole required for sprint weekend")
        if not data.sprint_quali_top10 or len(data.sprint_quali_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint quali top 10 required for sprint weekend")
        if not data.sprint_race_winner:
            raise HTTPException(status_code=400, detail="Sprint race winner required for sprint weekend")
        if not data.sprint_race_top10 or len(data.sprint_race_top10) != 10:
            raise HTTPException(status_code=400, detail="Sprint race top 10 required for sprint weekend")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    prediction_data = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "sprint_quali_pole": data.sprint_quali_pole if race.get("is_sprint") else None,
        "sprint_quali_top10": data.sprint_quali_top10 if race.get("is_sprint") else None,
        "sprint_race_winner": data.sprint_race_winner if race.get("is_sprint") else None,
        "sprint_race_top10": data.sprint_race_top10 if race.get("is_sprint") else None,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus_bets": data.bonus_bets.dict() if data.bonus_bets else None,
        "custom_predictions": data.custom_predictions,
        "updated_at": now,
    }

    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": prediction_data})
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **prediction_data, "locked": False}

    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        **prediction_data,
        "locked": False,
        "created_at": now,
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}


@router.get("/race/{race_id}")
async def get_my_prediction(race_id: str, user: dict = Depends(get_current_user)) -> dict | None:
    """Get user's prediction for a specific race"""
    prediction = await db.predictions.find_one({"user_id": user["id"], "race_id": race_id}, {"_id": 0})
    return prediction


@router.delete("/race/{race_id}")
async def delete_my_prediction(race_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Delete user's prediction for a specific race"""
    race = next((r for r in F1_RACES_2026 if r["id"] == race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Course non trouvée")

    close_time = get_predictions_close_time(race)
    if datetime.now(UTC) >= close_time:
        raise HTTPException(status_code=400, detail="Les pronostics sont clôturés, suppression impossible")

    result = await db.predictions.delete_one({"user_id": user["id"], "race_id": race_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aucun pronostic trouvé pour cette course")

    return {"message": "Pronostics supprimés avec succès"}


@router.get("/history")
async def get_prediction_history(
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
) -> list[dict]:
    """Get predictions history for the user (paginated)."""
    predictions = (
        await db.predictions.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(min(limit, 100))
        .to_list(min(limit, 100))
    )
    return predictions


@router.get("/stats")
async def get_prediction_stats(user: dict = Depends(get_current_user)) -> dict:
    """Get prediction statistics for the current user"""
    total_predictions = await count_individual_predictions(user["id"])
    races_participated = await db.predictions.count_documents({"user_id": user["id"]})

    return {"total_predictions": total_predictions, "races_participated": races_participated}


@router.get("/points-history")
async def get_points_history(user: dict = Depends(get_current_user)) -> dict:
    """Get detailed points history for the user"""
    predictions = await db.predictions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)

    history = []
    race_map = {r["id"]: r for r in F1_RACES_2026}

    for pred in predictions:
        race_id = pred.get("race_id")
        race = race_map.get(race_id)
        if not race:
            continue

        result = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})

        if result:
            points = calculate_points(pred, result.get("results", {}))

            history_entry = {
                "race_id": race_id,
                "race_name": race["name"],
                "race_date": race.get("date"),
                "is_sprint_weekend": race.get("is_sprint", False),
                "has_results": True,
                "points_breakdown": {
                    "quali_pole": {"points": points["quali_pole"], "label": "Pole Position"},
                    "quali_top10": {"points": points["quali_top10"], "label": "Top 10 Qualifications"},
                    "race_winner": {"points": points["race_winner"], "label": "Vainqueur Course"},
                    "race_top10": {"points": points["race_top10"], "label": "Top 10 Course"},
                    "bonus": {"points": points["bonus"], "label": "Bonus (SC, DNF, Meilleur tour, Leader T1)"},
                },
                "sprint_breakdown": None,
                "total_points": points["total"],
                "xp_earned": points["xp_earned"],
                "details": points["details"],
            }

            if race.get("is_sprint"):
                history_entry["sprint_breakdown"] = {
                    "sprint_quali_top10": {"points": points["sprint_quali_top10"], "label": "Top 10 Qualif Sprint"},
                    "sprint_race_top10": {"points": points["sprint_race_top10"], "label": "Top 10 Course Sprint"},
                }

            history.append(history_entry)
        else:
            history.append(
                {
                    "race_id": race_id,
                    "race_name": race["name"],
                    "race_date": race.get("date"),
                    "is_sprint_weekend": race.get("is_sprint", False),
                    "has_results": False,
                    "points_breakdown": None,
                    "sprint_breakdown": None,
                    "total_points": 0,
                    "xp_earned": 0,
                    "details": ["En attente des résultats"],
                }
            )

    history.sort(key=lambda x: x.get("race_date", ""), reverse=True)

    total_points = sum(h["total_points"] for h in history)
    total_xp = sum(h["xp_earned"] for h in history)

    return {
        "history": history,
        "summary": {
            "total_points": total_points,
            "total_xp": total_xp,
            "races_with_results": len([h for h in history if h["has_results"]]),
            "races_pending": len([h for h in history if not h["has_results"]]),
        },
    }


# ==================== SEPARATE SPRINT/MAIN PREDICTIONS ====================


@router.post("/sprint")
async def save_sprint_prediction(data: SprintPredictionCreate, user: dict = Depends(get_current_user)) -> dict:
    """Save sprint predictions separately (closes 15 min before SQ1)"""
    race = next((r for r in F1_RACES_2026 if r["id"] == data.race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    if not race.get("is_sprint"):
        raise HTTPException(status_code=400, detail="This is not a sprint weekend")

    sprint_predictions_close = get_sprint_predictions_close_time(race)
    if datetime.now(UTC) > sprint_predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sprint sont fermés (15 min avant SQ1)")

    if len(data.sprint_quali_top10) != 10 or len(data.sprint_race_top10) != 10:
        raise HTTPException(status_code=400, detail="Sprint Top 10 must have exactly 10 drivers")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    sprint_data = {
        "sprint_quali_pole": data.sprint_quali_pole,
        "sprint_quali_top10": data.sprint_quali_top10,
        "sprint_race_winner": data.sprint_race_winner,
        "sprint_race_top10": data.sprint_race_top10,
        "sprint_bonus_bets": data.sprint_bonus_bets.dict() if data.sprint_bonus_bets else None,
        "sprint_updated_at": now,
    }

    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": sprint_data})
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **sprint_data}

    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        **sprint_data,
        "locked": False,
        "created_at": now,
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}


@router.post("/main")
async def save_main_prediction(data: MainPredictionCreate, user: dict = Depends(get_current_user)) -> dict:
    """Save main race predictions separately (closes 15 min before Q1)"""
    race = next((r for r in F1_RACES_2026 if r["id"] == data.race_id), None)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    predictions_close = get_predictions_close_time(race)
    if datetime.now(UTC) > predictions_close:
        raise HTTPException(status_code=400, detail="Les pronostics sont fermés (15 min avant Q1)")

    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Top 10 must have exactly 10 drivers")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    main_data = {
        "quali_pole": data.quali_pole,
        "quali_top10": data.quali_top10,
        "race_winner": data.race_winner,
        "race_top10": data.race_top10,
        "bonus_bets": data.bonus_bets.dict() if data.bonus_bets else None,
        "main_updated_at": now,
    }

    if existing:
        await db.predictions.update_one({"id": existing["id"]}, {"$set": main_data})
        existing_clean = {k: v for k, v in existing.items() if k != "_id"}
        return {**existing_clean, **main_data}

    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id,
        "user_id": user["id"],
        "race_id": data.race_id,
        **main_data,
        "locked": False,
        "created_at": now,
    }
    await db.predictions.insert_one(prediction)
    return {k: v for k, v in prediction.items() if k != "_id"}


# ==================== CUSTOM PREDICTIONS ====================


@router.post("/custom")
async def create_custom_prediction(data: CustomPredictionCreate, user: dict = Depends(get_current_user)) -> dict:
    """Create a custom prediction for a league"""
    league = await db.leagues.find_one({"id": data.league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    prediction_id = str(uuid.uuid4())
    processed_choices = None
    if data.choices:
        processed_choices = []
        for i, c in enumerate(data.choices):
            choice_dict = c.dict()
            if not choice_dict.get("id"):
                choice_dict["id"] = f"choice_{i}"
            processed_choices.append(choice_dict)

    custom_pred = {
        "id": prediction_id,
        "race_id": data.race_id,
        "league_id": data.league_id,
        "created_by": user["id"],
        "question": data.question,
        "answer_type": data.answer_type,
        "multiple_choice": data.multiple_choice,
        "choices": processed_choices,
        "correct_answer": None,
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.custom_predictions.insert_one(custom_pred)
    return {k: v for k, v in custom_pred.items() if k != "_id"}


@router.get("/custom/league/{league_id}/race/{race_id}")
async def get_league_custom_predictions(
    league_id: str, race_id: str, user: dict = Depends(get_current_user)
) -> list[dict]:
    """Get custom predictions for a league and race"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    predictions = await db.custom_predictions.find({"league_id": league_id, "race_id": race_id}, {"_id": 0}).to_list(
        100
    )
    return predictions


@router.post("/custom/{prediction_id}/answer")
async def answer_custom_prediction(
    prediction_id: str, body: CustomPredictionAnswer, user: dict = Depends(get_current_user)
) -> dict:
    """Submit an answer to a custom prediction"""
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=404, detail="Custom prediction not found")

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


@router.post("/custom/{prediction_id}/set-correct")
async def set_correct_answer(
    prediction_id: str, body: SetCorrectAnswer, user: dict = Depends(get_current_user)
) -> dict:
    """Set the correct answer for a custom prediction (creator only)"""
    custom_pred = await db.custom_predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not custom_pred:
        raise HTTPException(status_code=404, detail="Custom prediction not found")
    if custom_pred["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only creator can set correct answer")

    await db.custom_predictions.update_one(
        {"id": prediction_id}, {"$set": {"correct_answer": body.correct_answer}}
    )

    answers = await db.custom_prediction_answers.find({"prediction_id": prediction_id}, {"_id": 0}).to_list(1000)
    correct = body.correct_answer

    for ans in answers:
        user_answer = ans.get("answer")
        is_correct = False

        if custom_pred["multiple_choice"]:
            if isinstance(user_answer, list) and isinstance(correct, list):
                is_correct = any(a in correct for a in user_answer)
            elif isinstance(user_answer, list):
                is_correct = correct in user_answer
        else:
            is_correct = user_answer == correct

        if is_correct:
            league = await db.leagues.find_one({"id": custom_pred["league_id"]}, {"_id": 0})
            if league:
                await db.leaderboard.update_one(
                    {"league_id": league["id"], "user_id": ans["user_id"]}, {"$inc": {"total_points": 2}}
                )
                await db.users.update_one({"id": ans["user_id"]}, {"$inc": {"xp": 10}})

    return {"message": "Correct answer set and points calculated"}
