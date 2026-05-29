"""
PRONOKIF - Admin Back-Office: predictions and scoring.

Prediction moderation, scoring ledger exports, and reconciliation workflows.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import _now_iso, log_backoffice_activity
from services.admin_csv import csv_response
from services.admin_predictions import (
    enrich_prediction_docs,
    filtered_admin_predictions,
    normalize_score_type,
    prediction_analytics_from_payloads,
    prediction_batch_update_payload,
    score_ledger_rows,
    score_ledger_summary,
    validate_prediction_admin_update,
)
from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.scoring_reconciliation import apply_reconciliation, build_reconciliation_report

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-predictions"])


class PredictionAdminUpdate(BaseModel):
    quali_pole: str | None = None
    quali_top10: list[str] | None = None
    sprint_quali_pole: str | None = None
    sprint_quali_top10: list[str] | None = None
    sprint_race_winner: str | None = None
    sprint_race_top10: list[str] | None = None
    race_winner: str | None = None
    race_top10: list[str] | None = None
    bonus_bets: dict[str, Any] | None = None
    sprint_bonus_bets: dict[str, Any] | None = None
    custom_predictions: Any | None = None
    locked: bool | None = None
    review_status: str | None = Field(default=None, max_length=50)
    admin_note: str | None = Field(default=None, max_length=4000)


class PredictionLockRequest(BaseModel):
    locked: bool = True
    reason: str | None = Field(default=None, max_length=500)


class PredictionBatchActionRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1, max_length=200)
    action: str = Field(..., pattern="^(lock|unlock|delete|set_review_status)$")
    review_status: str | None = Field(default=None, max_length=50)
    reason: str | None = Field(default=None, max_length=500)


class ScoringReconciliationApplyRequest(BaseModel):
    championship_id: str = F1_2026_CHAMPIONSHIP_ID
    confirm: str
    limit: int = Field(default=500, ge=1, le=5000)


@router.get("/predictions")
async def list_predictions(
    user_id: str | None = None,
    race_id: str | None = None,
    championship_id: str | None = None,
    q: str = "",
    status: str | None = None,
    review_status: str | None = None,
    locked: bool | None = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List predictions with admin enrichment and moderation filters."""
    result = await filtered_admin_predictions(
        user_id=user_id,
        race_id=race_id,
        championship_id=championship_id,
        q=q,
        status=status,
        review_status=review_status,
        locked=locked,
        skip=skip,
        limit=min(max(limit, 1), 100),
    )
    return {
        "predictions": result["predictions"],
        "total": result["total"],
        "skip": result["skip"],
        "limit": result["limit"],
        "summary": result["summary"],
    }


@router.post("/predictions/batch")
async def batch_update_predictions(
    data: PredictionBatchActionRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Apply a moderation action to several predictions at once."""
    prediction_ids = list(dict.fromkeys(data.ids))
    existing_predictions = await db.predictions.find(
        {"id": {"$in": prediction_ids}},
        {"_id": 0, "id": 1, "user_id": 1, "race_id": 1},
    ).to_list(len(prediction_ids))
    if not existing_predictions:
        raise HTTPException(status_code=404, detail="Aucun pronostic trouvé")

    found_ids = [prediction["id"] for prediction in existing_predictions]
    if data.action == "delete":
        result = await db.predictions.delete_many({"id": {"$in": found_ids}})
        modified_count = result.deleted_count
    else:
        updates = prediction_batch_update_payload(data, admin)
        result = await db.predictions.update_many({"id": {"$in": found_ids}}, {"$set": updates})
        modified_count = result.modified_count

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action=f"prediction.batch.{data.action}",
        entity_type="prediction_batch",
        entity_id=str(uuid.uuid4()),
        metadata={
            "prediction_ids": found_ids,
            "count": len(found_ids),
            "missing_ids": [prediction_id for prediction_id in prediction_ids if prediction_id not in found_ids],
            "review_status": data.review_status,
            "reason": data.reason,
            "user_ids": sorted({p.get("user_id") for p in existing_predictions if p.get("user_id")}),
            "race_ids": sorted({p.get("race_id") for p in existing_predictions if p.get("race_id")}),
        },
    )

    return {
        "message": "Action de masse appliquée",
        "action": data.action,
        "matched": len(found_ids),
        "modified": modified_count,
        "missing": len(prediction_ids) - len(found_ids),
    }


@router.get("/predictions/analytics")
async def get_predictions_analytics(
    user_id: str | None = None,
    race_id: str | None = None,
    championship_id: str | None = None,
    q: str = "",
    status: str | None = None,
    review_status: str | None = None,
    locked: bool | None = None,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Aggregate prediction moderation and scoring analytics for admin views."""
    result = await filtered_admin_predictions(
        user_id=user_id,
        race_id=race_id,
        championship_id=championship_id,
        q=q,
        status=status,
        review_status=review_status,
        locked=locked,
        skip=0,
        limit=5000,
        force_full_status_scan=True,
    )
    return prediction_analytics_from_payloads(result["all_predictions"])


@router.get("/predictions/export")
async def export_predictions_csv(
    user_id: str | None = None,
    race_id: str | None = None,
    championship_id: str | None = None,
    q: str = "",
    status: str | None = None,
    review_status: str | None = None,
    locked: bool | None = None,
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export filtered prediction rows as CSV for admin analysis."""
    result = await filtered_admin_predictions(
        user_id=user_id,
        race_id=race_id,
        championship_id=championship_id,
        q=q,
        status=status,
        review_status=review_status,
        locked=locked,
        skip=0,
        limit=min(max(export_limit, 1), 5000),
        force_full_status_scan=True,
    )
    rows = [
        {
            "id": prediction.get("id"),
            "created_at": prediction.get("created_at"),
            "updated_at": prediction.get("updated_at"),
            "user_id": prediction.get("user_id"),
            "user_email": prediction.get("user_email"),
            "user_username": prediction.get("user_username"),
            "race_id": prediction.get("race_id"),
            "race_name": prediction.get("race_name"),
            "race_date": prediction.get("race_date"),
            "completion_status": prediction.get("completion_status"),
            "missing_fields": prediction.get("missing_fields"),
            "locked": prediction.get("locked"),
            "review_status": prediction.get("review_status"),
            "score_total": prediction.get("score_total"),
            "quali_pole": prediction.get("quali_pole"),
            "race_winner": prediction.get("race_winner"),
            "quali_top10": prediction.get("quali_top10"),
            "race_top10": prediction.get("race_top10"),
            "admin_note": prediction.get("admin_note"),
        }
        for prediction in result["all_predictions"]
    ]
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="prediction.export",
        entity_type="prediction_export",
        entity_id="predictions-csv",
        metadata={"rows": len(rows), "filters": {"q": q, "status": status, "locked": locked}},
    )
    return csv_response(
        "pronokif-predictions.csv",
        rows,
        [
            ("id", "ID"),
            ("created_at", "Créé le"),
            ("updated_at", "Mis à jour le"),
            ("user_id", "ID joueur"),
            ("user_email", "Email joueur"),
            ("user_username", "Pseudo"),
            ("race_id", "ID course"),
            ("race_name", "Course"),
            ("race_date", "Date course"),
            ("completion_status", "Complétion"),
            ("missing_fields", "Champs manquants"),
            ("locked", "Verrouillé"),
            ("review_status", "Statut revue"),
            ("score_total", "Score"),
            ("quali_pole", "Pole"),
            ("race_winner", "Vainqueur"),
            ("quali_top10", "Top 10 qualifs"),
            ("race_top10", "Top 10 course"),
            ("admin_note", "Note admin"),
        ],
    )


@router.get("/scoring/reconciliation")
async def get_scoring_reconciliation(
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    limit: int = 500,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Audit leaderboard totals against official/custom scoring ledgers."""
    return await build_reconciliation_report(
        championship_id=championship_id,
        limit=min(max(limit, 1), 5000),
    )


@router.get("/scoring/ledger")
async def list_scoring_ledger(
    score_type: str = "all",
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    user_id: str | None = None,
    race_id: str | None = None,
    league_id: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List persisted scoring ledger rows for official and custom predictions."""
    limit = min(max(limit, 1), 100)
    normalized_score_type = normalize_score_type(score_type)
    rows = await score_ledger_rows(
        score_type=normalized_score_type,
        championship_id=championship_id,
        user_id=user_id,
        race_id=race_id,
        league_id=league_id,
        q=q,
        limit=5000,
    )
    start = max(skip, 0)
    return {
        "scores": rows[start : start + limit],
        "total": len(rows),
        "skip": start,
        "limit": limit,
        "summary": score_ledger_summary(rows),
    }


@router.get("/scoring/ledger/export")
async def export_scoring_ledger_csv(
    score_type: str = "all",
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    user_id: str | None = None,
    race_id: str | None = None,
    league_id: str | None = None,
    q: str = "",
    export_limit: int = 5000,
    admin: dict = Depends(get_current_admin),
) -> Response:
    """Export persisted scoring ledger rows as CSV."""
    normalized_score_type = normalize_score_type(score_type)
    rows = await score_ledger_rows(
        score_type=normalized_score_type,
        championship_id=championship_id,
        user_id=user_id,
        race_id=race_id,
        league_id=league_id,
        q=q,
        limit=min(max(export_limit, 1), 5000),
    )
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="scoring.ledger_export",
        entity_type="scoring_ledger_export",
        entity_id="scoring-ledger-csv",
        metadata={
            "rows": len(rows),
            "filters": {
                "score_type": normalized_score_type,
                "championship_id": championship_id,
                "user_id": user_id,
                "race_id": race_id,
                "league_id": league_id,
                "q": q,
            },
        },
    )
    return csv_response(
        "pronokif-scoring-ledger.csv",
        rows,
        [
            ("id", "ID"),
            ("source", "Source"),
            ("title", "Objet"),
            ("prediction_id", "ID pronostic"),
            ("user_id", "ID joueur"),
            ("user_email", "Email joueur"),
            ("user_username", "Pseudo"),
            ("race_id", "ID course"),
            ("race_name", "Course"),
            ("league_id", "ID ligue"),
            ("league_name", "Ligue"),
            ("championship_id", "Championnat"),
            ("season", "Saison"),
            ("points", "Points"),
            ("xp_awarded", "XP"),
            ("is_correct", "Réponse correcte"),
            ("scored_at", "Scoré le"),
            ("scored_by", "Scoré par"),
            ("answered_at", "Répondu le"),
            ("answer", "Réponse"),
            ("correct_answer", "Réponse officielle"),
            ("details", "Détails"),
            ("breakdown", "Ventilation"),
        ],
    )


@router.post("/scoring/reconciliation/apply")
async def apply_scoring_reconciliation(
    data: ScoringReconciliationApplyRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Repair leaderboard totals from scoring ledgers after explicit confirmation."""
    if data.confirm != "RECONCILE_SCORES":
        raise HTTPException(status_code=400, detail="Confirmation RECONCILE_SCORES requise")

    result = await apply_reconciliation(
        championship_id=data.championship_id,
        actor=admin.get("email"),
        limit=data.limit,
    )
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="scoring.reconciliation_apply",
        entity_type="scoring_reconciliation",
        entity_id=data.championship_id,
        metadata={
            "repaired": result["repaired"],
            "mismatches": result["summary"]["mismatches"],
            "missing_entries": result["summary"]["missing_entries"],
        },
    )
    return result


@router.get("/predictions/{prediction_id}")
async def get_prediction_detail(
    prediction_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Get one prediction with user, race, completion, and score context."""
    prediction = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not prediction:
        raise HTTPException(status_code=404, detail="Pronostic introuvable")
    enriched = await enrich_prediction_docs([prediction])
    return enriched[0]


@router.put("/predictions/{prediction_id}")
async def update_prediction_detail(
    prediction_id: str,
    data: PredictionAdminUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Admin update for a prediction while preserving an activity trail."""
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    validate_prediction_admin_update(updates)
    existing = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Pronostic introuvable")

    updates["updated_at"] = _now_iso()
    updates["admin_updated_at"] = updates["updated_at"]
    updates["admin_updated_by"] = admin.get("email")
    result = await db.predictions.update_one({"id": prediction_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pronostic introuvable")

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="prediction.update",
        entity_type="prediction",
        entity_id=prediction_id,
        metadata={
            "fields": sorted(updates.keys()),
            "user_id": existing.get("user_id"),
            "race_id": existing.get("race_id"),
        },
    )
    updated = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    enriched = await enrich_prediction_docs([updated])
    return {"message": "Pronostic mis à jour", "prediction": enriched[0]}


@router.post("/predictions/{prediction_id}/lock")
async def lock_prediction_detail(
    prediction_id: str,
    data: PredictionLockRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Lock or unlock a prediction from the admin workspace."""
    prediction = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not prediction:
        raise HTTPException(status_code=404, detail="Pronostic introuvable")

    updates = {
        "locked": data.locked,
        "locked_at": _now_iso() if data.locked else None,
        "locked_by": admin.get("email") if data.locked else None,
        "lock_reason": data.reason,
        "updated_at": _now_iso(),
    }
    await db.predictions.update_one({"id": prediction_id}, {"$set": updates})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="prediction.lock" if data.locked else "prediction.unlock",
        entity_type="prediction",
        entity_id=prediction_id,
        metadata={
            "user_id": prediction.get("user_id"),
            "race_id": prediction.get("race_id"),
            "reason": data.reason,
        },
    )
    updated = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    enriched = await enrich_prediction_docs([updated])
    return {"message": "Pronostic verrouillé" if data.locked else "Pronostic déverrouillé", "prediction": enriched[0]}


@router.delete("/predictions/{prediction_id}")
async def delete_prediction_detail(
    prediction_id: str,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Delete one prediction and write an admin activity log."""
    prediction = await db.predictions.find_one({"id": prediction_id}, {"_id": 0})
    if not prediction:
        raise HTTPException(status_code=404, detail="Pronostic introuvable")
    await db.predictions.delete_one({"id": prediction_id})
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="prediction.delete",
        entity_type="prediction",
        entity_id=prediction_id,
        metadata={"user_id": prediction.get("user_id"), "race_id": prediction.get("race_id")},
    )
    return {"message": "Pronostic supprimé"}
