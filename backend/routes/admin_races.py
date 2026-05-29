"""
PRONOKIF - Admin Back-Office: Race Management.

Editable race calendar, F1 2026 seeding, prediction coverage overview,
reminders, and official rescoring workflows.
"""

from __future__ import annotations

import html
import os
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin
from services.admin_activity import _now_iso, log_backoffice_activity
from services.admin_predictions import get_admin_race, prediction_is_complete
from services.admin_races import (
    completion_rate,
    driver_label,
    driver_labels,
    predictions_close_at,
    race_create_doc,
    race_doc_from_static,
    race_editorial_payload,
    race_update_payload,
    scoring_coverage_payload,
)
from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    backfill_f1_2026_entity_links,
    ensure_f1_2026_championship,
)
from services.email import send_email
from services.race_calendar import (
    ACTIVE_2026_RACE_ORDER,
    CANCELLED_2026_RACE_IDS,
    active_2026_races,
    has_complete_race_results,
    race_timing_payload,
    race_with_circuit_timezone,
)
from services.results import set_official_and_score

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-races"])


class RaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    circuit: str | None = None
    country: str | None = None
    date: str
    quali_date: str | None = None
    fp1_date: str | None = None
    fp1_time: str | None = None
    fp2_date: str | None = None
    fp2_time: str | None = None
    fp3_date: str | None = None
    fp3_time: str | None = None
    quali_time: str | None = None
    race_time: str | None = None
    sprint_quali_date: str | None = None
    sprint_quali_time: str | None = None
    sprint_race_date: str | None = None
    sprint_race_time: str | None = None
    timezone: str | None = None
    race_duration_minutes: int = Field(default=120, ge=1, le=1440)
    is_sprint: bool = False
    round_number: int | None = None
    season: int = Field(..., ge=2020, le=2030)
    championship_id: str | None = None
    thumbnail_url: str | None = None
    is_cancelled: bool = False
    is_test_race: bool = False
    content_status: str | None = None
    track_profile: str | None = None
    story_angle: str | None = None
    key_info: list[str] | None = None
    public_recap: str | None = None
    admin_summary: str | None = None
    cancellation_reason: str | None = None
    cancellation_impact: str | None = None
    user_content_idea: str | None = None


class RaceUpdate(BaseModel):
    name: str | None = None
    circuit: str | None = None
    country: str | None = None
    date: str | None = None
    quali_date: str | None = None
    fp1_date: str | None = None
    fp1_time: str | None = None
    fp2_date: str | None = None
    fp2_time: str | None = None
    fp3_date: str | None = None
    fp3_time: str | None = None
    quali_time: str | None = None
    race_time: str | None = None
    sprint_quali_date: str | None = None
    sprint_quali_time: str | None = None
    sprint_race_date: str | None = None
    sprint_race_time: str | None = None
    timezone: str | None = None
    race_duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    is_sprint: bool | None = None
    round_number: int | None = None
    season: int | None = Field(default=None, ge=2020, le=2030)
    championship_id: str | None = None
    thumbnail_url: str | None = None
    is_past: bool | None = None
    is_cancelled: bool | None = None
    is_test_race: bool | None = None
    content_status: str | None = None
    track_profile: str | None = None
    story_angle: str | None = None
    key_info: list[str] | None = None
    public_recap: str | None = None
    admin_summary: str | None = None
    cancellation_reason: str | None = None
    cancellation_impact: str | None = None
    user_content_idea: str | None = None


class RaceReminderRequest(BaseModel):
    user_ids: list[str] | None = None
    send_email: bool = True
    send_notification: bool = True


class RaceRescoreRequest(BaseModel):
    confirm: str


class DemoSeedRequest(BaseModel):
    confirm: str


async def _race_prediction_overview(race_id: str) -> dict:
    race = await get_admin_race(race_id)
    result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0, "results": 1})
    has_results = False if race.get("is_cancelled") else has_complete_race_results(result_doc)
    timing = race_timing_payload(race, has_results=has_results)
    race.update(timing)
    race["has_results"] = has_results and timing["status"] == "finished"
    users = await (
        db.users.find(
            {"is_banned": {"$ne": True}},
            {"_id": 0, "id": 1, "email": 1, "username": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .to_list(1000)
    )
    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(1000)
    predictions_by_user = {prediction.get("user_id"): prediction for prediction in predictions}

    prediction_entries = []
    missing_users = []
    complete_count = 0

    for user in users:
        prediction = predictions_by_user.get(user["id"])
        if not prediction:
            if not race.get("is_cancelled"):
                missing_users.append(user)
            continue

        is_complete = prediction_is_complete(prediction, race)
        if is_complete:
            complete_count += 1
        prediction_entries.append(
            {
                "id": prediction.get("id"),
                "user": user,
                "is_complete": is_complete,
                "created_at": prediction.get("created_at"),
                "updated_at": prediction.get("updated_at") or prediction.get("main_updated_at"),
                "quali_pole": driver_label(prediction.get("quali_pole")),
                "quali_top10": driver_labels(prediction.get("quali_top10")),
                "sprint_quali_pole": driver_label(prediction.get("sprint_quali_pole")),
                "sprint_quali_top10": driver_labels(prediction.get("sprint_quali_top10")),
                "sprint_race_winner": driver_label(prediction.get("sprint_race_winner")),
                "sprint_race_top10": driver_labels(prediction.get("sprint_race_top10")),
                "race_winner": driver_label(prediction.get("race_winner")),
                "race_top10": driver_labels(prediction.get("race_top10")),
                "bonus_bets": prediction.get("bonus_bets"),
                "sprint_bonus_bets": prediction.get("sprint_bonus_bets"),
            }
        )

    total_users = len(users)
    submitted_count = len(prediction_entries)
    missing_count = len(missing_users)
    scored_count = await db.prediction_scores.count_documents(
        {"score_type": "official_race", "race_id": race_id}
    )

    return {
        "race": race,
        "editorial": race_editorial_payload(
            race,
            result_doc,
            submitted=submitted_count,
            missing=missing_count,
            total_users=total_users,
        ),
        "total_users": total_users,
        "submitted_count": submitted_count,
        "complete_count": complete_count,
        "missing_count": missing_count,
        "completion_rate": completion_rate(submitted_count, total_users),
        **scoring_coverage_payload(
            submitted=submitted_count,
            scored=scored_count,
            has_results=race["has_results"],
        ),
        "predictions_close_at": predictions_close_at(race),
        "predictions": prediction_entries,
        "missing_users": missing_users,
    }


async def _send_prediction_reminder_email(user: dict, race: dict) -> bool:
    email = str(user.get("email", "")).strip()
    if not email:
        return False

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    prediction_url = f"{frontend_url}/predictions/{race['id']}"
    safe_url = html.escape(prediction_url, quote=True)
    safe_race_name = html.escape(str(race.get("name", "the race")))

    text_body = f"""PronoKif prediction reminder

You have not finalized your prediction for {race.get("name", "the next race")}.

Open your prediction:
{prediction_url}
"""
    html_body = f"""
    <html>
      <body style="margin:0;background:#0b0d12;color:#f4f4f4;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:36px 20px;">
          <div style="background:#121418;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:28px;">
            <p style="margin:0 0 8px;color:#e10600;font-weight:700;letter-spacing:.08em;">PRONOKIF</p>
            <h1 style="margin:0 0 14px;font-size:24px;color:#ffffff;">Your prediction is waiting</h1>
            <p style="margin:0 0 22px;color:#c9ced8;line-height:1.55;">
              You have not finalized your prediction for <strong>{safe_race_name}</strong>.
            </p>
            <a href="{safe_url}" style="display:inline-block;background:#e10600;color:#fff;
              padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
              Make predictions now
            </a>
          </div>
        </div>
      </body>
    </html>
    """
    return await send_email(
        email,
        f"PronoKif - Prediction reminder {race.get('name', '')}".strip(),
        text_body,
        html_body,
    )


@router.get("/races")
async def list_races(
    season: int | None = None,
    championship_id: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all races, optionally filtered by season."""
    query = {}
    if season:
        query["season"] = season
    if championship_id:
        query["championship_id"] = championship_id
    races = await db.races.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    races = [race_with_circuit_timezone(race) for race in races]
    active_user_ids = await db.users.distinct("id", {"is_banned": {"$ne": True}})
    total_users = len(active_user_ids)
    now = datetime.now(UTC)
    for race in races:
        race_id = race["id"]
        result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0, "results": 1})
        has_results = False if race.get("is_cancelled") else has_complete_race_results(result_doc)
        timing = race_timing_payload(race, now=now, has_results=has_results)
        race.update(timing)
        race["has_results"] = has_results and timing["status"] == "finished"
        if total_users:
            submitted = await db.predictions.count_documents(
                {"race_id": race_id, "user_id": {"$in": active_user_ids}}
            )
        else:
            submitted = 0
        missing = 0 if race.get("is_cancelled") else max(total_users - submitted, 0)
        race["submitted_predictions"] = submitted
        race["missing_predictions"] = missing
        race["completion_rate"] = completion_rate(submitted, total_users)
        scored_count = await db.prediction_scores.count_documents(
            {"score_type": "official_race", "race_id": race_id}
        )
        race.update(
            scoring_coverage_payload(
                submitted=submitted,
                scored=scored_count,
                has_results=race["has_results"],
            )
        )
        race["editorial"] = race_editorial_payload(
            race,
            result_doc,
            submitted=submitted,
            missing=missing,
            total_users=total_users,
        )
    return races


@router.post("/races/seed-2026")
async def seed_2026_races(admin: dict = Depends(get_current_admin)) -> dict:
    """Seed the editable back-office race calendar from the canonical 2026 data."""
    inserted = 0
    updated = 0
    now = _now_iso()
    championship = await ensure_f1_2026_championship(
        races=active_2026_races(),
        actor=admin.get("email"),
    )

    for index, race in enumerate(active_2026_races(), start=1):
        race_doc = race_doc_from_static(race, index)
        result = await db.races.update_one(
            {"id": race_doc["id"]},
            {
                "$set": {
                    **race_doc,
                    "updated_at": now,
                    "updated_by": admin.get("email"),
                },
                "$setOnInsert": {"created_at": now, "created_by": admin.get("email")},
            },
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    cancelled_results = await db.race_results.delete_many(
        {"race_id": {"$in": list(CANCELLED_2026_RACE_IDS)}}
    )
    backfilled = await backfill_f1_2026_entity_links(race_ids=championship["race_ids"])
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.seed_2026",
        entity_type="race",
        entity_id="season-2026",
        metadata={
            "inserted": inserted,
            "updated": updated,
            "cancelled_results_removed": cancelled_results.deleted_count,
            "backfilled": backfilled,
        },
    )

    return {
        "message": "2026 calendar synced",
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "inserted": inserted,
        "updated": updated,
        "existing": updated,
        "total": len(ACTIVE_2026_RACE_ORDER),
        "cancelled_results_removed": cancelled_results.deleted_count,
        "backfilled": backfilled,
    }


@router.post("/demo/seed")
async def seed_demo_dataset(
    data: DemoSeedRequest, admin: dict = Depends(get_current_admin)
) -> dict:
    """Seed a complete demo dataset for local/staging validation."""
    if data.confirm != "SEED_DEMO":
        raise HTTPException(status_code=400, detail="Confirmation SEED_DEMO requise")

    from seed_demo import seed_demo_data

    summary = await seed_demo_data()
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="demo.seed",
        entity_type="demo_dataset",
        entity_id="demo",
        metadata=summary,
    )
    return {
        "message": "Demo dataset synced",
        "seeded_by": admin.get("email"),
        "summary": summary,
    }


@router.post("/races")
async def create_race(
    data: RaceCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new race event."""
    race = race_create_doc(data, now=_now_iso(), actor_email=admin.get("email"))
    await db.races.insert_one(race)
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.create",
        entity_type="race",
        entity_id=race["id"],
        metadata={"name": race.get("name"), "season": race.get("season")},
    )
    return {"message": "Race created", "id": race["id"]}


@router.put("/races/{race_id}")
async def update_race(
    race_id: str, data: RaceUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a race event."""
    updates = race_update_payload(data, now=_now_iso(), actor_email=admin.get("email"))
    result = await db.races.update_one({"id": race_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.update",
        entity_type="race",
        entity_id=race_id,
        metadata={"fields": sorted(updates.keys())},
    )
    return {"message": "Race updated"}


@router.get("/races/{race_id}/predictions-overview")
async def get_race_predictions_overview(
    race_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Return prediction progress, submitted predictions, and missing users for a race."""
    return await _race_prediction_overview(race_id)


@router.post("/races/{race_id}/rescore")
async def rescore_race_predictions(
    race_id: str,
    data: RaceRescoreRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Replay official scoring for one race from stored results."""
    if data.confirm != "RESCORE_RACE":
        raise HTTPException(status_code=400, detail="Confirmation RESCORE_RACE requise")

    race = await get_admin_race(race_id)
    if race.get("is_cancelled"):
        raise HTTPException(status_code=400, detail="Course annulée, aucun scoring attendu")

    result_doc = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not has_complete_race_results(result_doc):
        raise HTTPException(status_code=400, detail="Résultats officiels incomplets")

    processed = await set_official_and_score(
        race_id=race_id,
        results=result_doc["results"],
        entered_by=admin.get("email") or "admin",
        auto_synced=bool(result_doc.get("auto_synced")),
    )
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.rescore",
        entity_type="race",
        entity_id=race_id,
        metadata={"predictions_processed": processed, "race_name": race.get("name")},
    )
    return {
        "message": "Course rescored",
        "race_id": race_id,
        "race_name": race.get("name"),
        "predictions_processed": processed,
    }


@router.post("/races/{race_id}/reminders")
async def send_race_prediction_reminders(
    race_id: str,
    data: RaceReminderRequest,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Send reminders to users who have not submitted a prediction for the race."""
    overview = await _race_prediction_overview(race_id)
    race = overview["race"]
    if race.get("is_cancelled"):
        return {
            "message": "Race cancelled, no reminder sent",
            "targeted": 0,
            "notifications_sent": 0,
            "emails_sent": 0,
            "emails_failed": 0,
        }
    missing_users = overview["missing_users"]
    if data.user_ids:
        selected_ids = set(data.user_ids)
        missing_users = [user for user in missing_users if user["id"] in selected_ids]

    if not missing_users:
        return {
            "message": "No player to remind",
            "targeted": 0,
            "notifications_sent": 0,
            "emails_sent": 0,
            "emails_failed": 0,
        }

    notification_id = None
    if data.send_notification:
        notification_id = str(uuid.uuid4())
        await db.notifications.insert_one(
            {
                "id": notification_id,
                "title": f"Prediction pending - {race.get('name', 'Course')}",
                "message": "You still have a prediction to finalize before the weekend deadline.",
                "type": "important",
                "target_user_ids": [user["id"] for user in missing_users],
                "race_id": race_id,
                "created_at": _now_iso(),
                "created_by": admin.get("id") or admin.get("email"),
            }
        )
        await db.users.update_many(
            {"id": {"$in": [user["id"] for user in missing_users]}},
            {"$addToSet": {"unread_notifications": notification_id}},
        )

    emails_sent = 0
    emails_failed = 0
    if data.send_email:
        for user in missing_users:
            if await _send_prediction_reminder_email(user, race):
                emails_sent += 1
            else:
                emails_failed += 1

    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.reminders",
        entity_type="race",
        entity_id=race_id,
        metadata={
            "targeted": len(missing_users),
            "notifications_sent": len(missing_users) if notification_id else 0,
            "emails_sent": emails_sent,
            "emails_failed": emails_failed,
            "user_ids": [user["id"] for user in missing_users],
        },
    )

    return {
        "message": "Reminders sent",
        "targeted": len(missing_users),
        "notifications_sent": len(missing_users) if notification_id else 0,
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
    }


@router.delete("/races/{race_id}")
async def delete_race(
    race_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a race event."""
    result = await db.races.delete_one({"id": race_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course introuvable")
    await log_backoffice_activity(
        admin,
        db_handle=db,
        action="race.delete",
        entity_type="race",
        entity_id=race_id,
        metadata={},
    )
    return {"message": "Race deleted"}
