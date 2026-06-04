"""
PRONOKIF - Prediction Routes
/predictions/* endpoints for managing user predictions
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from config import db
from models.schemas import (
    CustomPredictionAnswer,
    CustomPredictionCreate,
    MainPredictionCreate,
    PredictionCreate,
    SetCorrectAnswer,
    SprintPredictionCreate,
)
from services.auth import get_current_user
from services.championships import championship_context_for_race_id, with_championship_link
from services.custom_prediction_scoring import settle_custom_prediction
from services.predictions import count_individual_predictions  # re-export for backward compat
from services.race_calendar import (
    active_2026_races,
    predictions_close_at_utc,
    race_with_circuit_timezone,
    sprint_predictions_close_at_utc,
)
from services.scoring import calculate_points

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ==================== HELPER FUNCTIONS ====================


def get_predictions_close_time(race: dict) -> datetime:
    """Get the time when main race predictions close (race start / lights out)."""
    close_at = predictions_close_at_utc(race)
    if close_at is None:
        raise ValueError(f"Invalid qualifying schedule for {race.get('id')}")
    return close_at


def get_sprint_predictions_close_time(race: dict):
    """Get the time when sprint predictions close (15 min before SQ1)"""
    return sprint_predictions_close_at_utc(race)


async def _get_race(race_id: str) -> dict | None:
    race = await db.races.find_one({"id": race_id}, {"_id": 0})
    if race:
        return with_championship_link(race_with_circuit_timezone(race))
    static_race = next((r for r in active_2026_races() if r["id"] == race_id), None)
    return with_championship_link(static_race) if static_race else None


async def _calendar_races() -> list[dict]:
    races = await db.races.find({"season": 2026}, {"_id": 0}).to_list(200)
    return [
        with_championship_link(race_with_circuit_timezone(race))
        for race in (races or active_2026_races())
    ]


# count_individual_predictions moved to services/predictions.py (S1 lot 3 dedup).
# Re-exported above so existing in-file callers keep working unchanged.


# ==================== MAIN PREDICTION ENDPOINTS ====================


@router.post("")
async def create_prediction(data: PredictionCreate, user: dict = Depends(get_current_user)) -> dict:
    """Create or update a prediction for a race"""
    race = await _get_race(data.race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")

    predictions_close = get_predictions_close_time(race)
    if datetime.now(UTC) > predictions_close:
        raise HTTPException(status_code=400, detail="Pronos verrouillés : la course a démarré")

    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Le Top 10 doit contenir exactement 10 pilotes")

    if race.get("is_sprint"):
        if not data.sprint_quali_pole:
            raise HTTPException(status_code=400, detail="La pole sprint est requise pour un week-end sprint")
        if not data.sprint_quali_top10 or len(data.sprint_quali_top10) != 10:
            raise HTTPException(status_code=400, detail="Le Top 10 sprint qualifs est requis pour un week-end sprint")
        if not data.sprint_race_winner:
            raise HTTPException(status_code=400, detail="Le vainqueur sprint est requis pour un week-end sprint")
        if not data.sprint_race_top10 or len(data.sprint_race_top10) != 10:
            raise HTTPException(status_code=400, detail="Le Top 10 course sprint est requis pour un week-end sprint")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    prediction_data = {
        "season": race.get("season", 2026),
        "championship_id": race.get("championship_id"),
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
    race = await _get_race(race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")

    close_time = get_predictions_close_time(race)
    if datetime.now(UTC) >= close_time:
        raise HTTPException(status_code=400, detail="Pronos fermés, suppression impossible")

    result = await db.predictions.delete_one({"user_id": user["id"], "race_id": race_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aucun prono trouvé pour cette course")

    return {"message": "Predictions deleted successfully"}


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
    race_map = {r["id"]: r for r in await _calendar_races()}

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
                    "race_winner": {"points": points["race_winner"], "label": "Race Winner"},
                    "race_top10": {"points": points["race_top10"], "label": "Race Top 10"},
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
                    "sprint_race_top10": {"points": points["sprint_race_top10"], "label": "Sprint Race Top 10"},
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
                    "details": ["Waiting for results"],
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
    race = await _get_race(data.race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")

    if not (race.get("is_sprint") or race.get("is_sprint_weekend")):
        raise HTTPException(status_code=400, detail="Ce n'est pas un week-end sprint")

    sprint_predictions_close = get_sprint_predictions_close_time(race)
    if datetime.now(UTC) > sprint_predictions_close:
        raise HTTPException(status_code=400, detail="Pronos sprint fermés (15 min avant les SQ1)")

    if len(data.sprint_quali_top10) != 10 or len(data.sprint_race_top10) != 10:
        raise HTTPException(status_code=400, detail="Le Top 10 sprint doit contenir exactement 10 pilotes")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    sprint_data = {
        "season": race.get("season", 2026),
        "championship_id": race.get("championship_id"),
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
    race = await _get_race(data.race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Course introuvable")

    predictions_close = get_predictions_close_time(race)
    if datetime.now(UTC) > predictions_close:
        raise HTTPException(status_code=400, detail="Pronos fermés (15 min avant les Q1)")

    if len(data.quali_top10) != 10 or len(data.race_top10) != 10:
        raise HTTPException(status_code=400, detail="Le Top 10 doit contenir exactement 10 pilotes")

    now = datetime.now(UTC).isoformat()
    existing = await db.predictions.find_one({"user_id": user["id"], "race_id": data.race_id})

    main_data = {
        "season": race.get("season", 2026),
        "championship_id": race.get("championship_id"),
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
        raise HTTPException(status_code=403, detail="Tu ne fais pas partie de cette ligue")

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
        **await championship_context_for_race_id(data.race_id),
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
        raise HTTPException(status_code=403, detail="Tu ne fais pas partie de cette ligue")

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
        raise HTTPException(status_code=404, detail="Prono custom introuvable")
    if custom_pred.get("correct_answer") is not None:
        raise HTTPException(status_code=400, detail="Ce prono custom est déjà scoré")
    league = await db.leagues.find_one({"id": custom_pred["league_id"]}, {"_id": 0})
    if not league or user["id"] not in league.get("members", []):
        raise HTTPException(status_code=403, detail="Tu ne fais pas partie de cette ligue")

    await db.custom_prediction_answers.update_one(
        {"prediction_id": prediction_id, "user_id": user["id"]},
        {
            "$set": {
                "prediction_id": prediction_id,
                "user_id": user["id"],
                "league_id": custom_pred["league_id"],
                "race_id": custom_pred["race_id"],
                "championship_id": custom_pred.get("championship_id"),
                "season": custom_pred.get("season"),
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
        raise HTTPException(status_code=404, detail="Prono custom introuvable")
    if custom_pred["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Seul le créateur peut définir la bonne réponse")

    summary = await settle_custom_prediction(
        custom_pred,
        correct_answer=body.correct_answer,
        scored_by=user["id"],
    )
    return {"message": "Correct answer set and points calculated", **summary}
