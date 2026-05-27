"""
PRONOKIF - Admin Back-Office: Data Management.

CRUD for users, championships, races, predictions, feedbacks.

Endpoints:
  GET    /admin-bo/users               - list users (paginated, searchable)
  GET    /admin-bo/users/:id           - user detail with stats
  PUT    /admin-bo/users/:id           - update user
  DELETE /admin-bo/users/:id           - delete user + related data

  GET    /admin-bo/championships       - list championships
  POST   /admin-bo/championships       - create championship
  PUT    /admin-bo/championships/:id   - update championship
  DELETE /admin-bo/championships/:id   - delete championship

  GET    /admin-bo/races               - list races (filterable by season)
  POST   /admin-bo/races               - create race
  PUT    /admin-bo/races/:id           - update race
  DELETE /admin-bo/races/:id           - delete race

  GET    /admin-bo/predictions         - list predictions (filterable)

  GET    /admin-bo/feedbacks           - list feedbacks
  PUT    /admin-bo/feedbacks/:id/read  - mark feedback read
  DELETE /admin-bo/feedbacks/:id       - delete feedback
"""

from __future__ import annotations

import html
import os
import uuid
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import db
from data.f1_data import F1_DRIVERS_2026
from routes.admin_auth import ADMIN_EMAILS, get_current_admin
from services.email import send_email
from services.race_calendar import (
    ACTIVE_2026_CALENDAR_OVERRIDES,
    ACTIVE_2026_RACE_ORDER,
    CANCELLED_2026_RACE_IDS,
    active_2026_races,
    has_complete_race_results,
    predictions_close_at_utc,
    race_temporal_status,
    race_timing_payload,
    race_with_circuit_timezone,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-data"])


# ═══════════════════════════════════════ USERS CRUD ═══════════════════════════


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    is_banned: Optional[bool] = None


def _is_protected_admin_user(user: dict) -> bool:
    email = str(user.get("email", "")).strip().lower()
    return bool(email and email in ADMIN_EMAILS)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _race_thumbnail_url(race_id: str) -> str:
    return f"/images/races/{race_id}.webp"


def _race_doc_from_static(race: dict, round_number: int) -> dict:
    overrides = ACTIVE_2026_CALENDAR_OVERRIDES.get(race["id"], {})
    race_doc = {
        **race,
        "round_number": race.get("round_number") or overrides.get("round_number", round_number),
        "season": 2026,
        "thumbnail_url": _race_thumbnail_url(race["id"]),
        "has_results": False,
        "is_past": _is_race_past(race),
        "is_cancelled": bool(race.get("is_cancelled")),
        "race_duration_minutes": race.get("race_duration_minutes", 120),
        "is_test_race": bool(race.get("is_test_race", False)),
        "seed_source": "f1_2026",
    }
    race_doc["is_past"] = _is_race_past(race_doc)
    return race_doc


def _is_race_past(race: dict) -> bool:
    return race_temporal_status(race) == "finished"


def _predictions_close_at(race: dict) -> str | None:
    close_at = predictions_close_at_utc(race)
    return close_at.isoformat() if close_at else None


def _prediction_is_complete(prediction: dict, race: dict) -> bool:
    has_main = (
        bool(prediction.get("quali_pole"))
        and len(prediction.get("quali_top10") or []) == 10
        and bool(prediction.get("race_winner"))
        and len(prediction.get("race_top10") or []) == 10
    )
    if not race.get("is_sprint"):
        return has_main
    has_sprint = (
        bool(prediction.get("sprint_quali_pole"))
        and len(prediction.get("sprint_quali_top10") or []) == 10
        and bool(prediction.get("sprint_race_winner"))
        and len(prediction.get("sprint_race_top10") or []) == 10
    )
    return has_main and has_sprint


def _driver_label(driver_id: str | None) -> str | None:
    if not driver_id:
        return None
    driver = next((d for d in F1_DRIVERS_2026 if d["id"] == driver_id), None)
    if not driver:
        return driver_id
    return f"{driver.get('code') or driver['name']} - {driver['name']}"


def _driver_labels(driver_ids: list[str] | None) -> list[str]:
    return [label for driver_id in (driver_ids or []) if (label := _driver_label(driver_id))]


def _completion_rate(submitted: int, total: int) -> int:
    if total <= 0:
        return 0
    return min(100, round((submitted / total) * 100))


async def _get_admin_race(race_id: str) -> dict:
    race = await db.races.find_one({"id": race_id}, {"_id": 0})
    if race:
        return race_with_circuit_timezone(race)
    static_race = next((r for r in active_2026_races() if r["id"] == race_id), None)
    if static_race:
        return _race_doc_from_static(
            static_race,
            ACTIVE_2026_CALENDAR_OVERRIDES.get(race_id, {}).get("round_number", 1),
        )
    raise HTTPException(status_code=404, detail="Course non trouvee")


async def _race_prediction_overview(race_id: str) -> dict:
    race = await _get_admin_race(race_id)
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

        is_complete = _prediction_is_complete(prediction, race)
        if is_complete:
            complete_count += 1
        prediction_entries.append(
            {
                "id": prediction.get("id"),
                "user": user,
                "is_complete": is_complete,
                "created_at": prediction.get("created_at"),
                "updated_at": prediction.get("updated_at") or prediction.get("main_updated_at"),
                "quali_pole": _driver_label(prediction.get("quali_pole")),
                "quali_top10": _driver_labels(prediction.get("quali_top10")),
                "sprint_quali_pole": _driver_label(prediction.get("sprint_quali_pole")),
                "sprint_quali_top10": _driver_labels(prediction.get("sprint_quali_top10")),
                "sprint_race_winner": _driver_label(prediction.get("sprint_race_winner")),
                "sprint_race_top10": _driver_labels(prediction.get("sprint_race_top10")),
                "race_winner": _driver_label(prediction.get("race_winner")),
                "race_top10": _driver_labels(prediction.get("race_top10")),
                "bonus_bets": prediction.get("bonus_bets"),
                "sprint_bonus_bets": prediction.get("sprint_bonus_bets"),
            }
        )

    total_users = len(users)
    submitted_count = len(prediction_entries)
    missing_count = len(missing_users)
    completion_rate = _completion_rate(submitted_count, total_users)

    return {
        "race": race,
        "total_users": total_users,
        "submitted_count": submitted_count,
        "complete_count": complete_count,
        "missing_count": missing_count,
        "completion_rate": completion_rate,
        "predictions_close_at": _predictions_close_at(race),
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
    safe_race_name = html.escape(str(race.get("name", "la course")))

    text_body = f"""Rappel pronostic PronoKif

Tu n'as pas encore finalise ton pronostic pour {race.get("name", "la prochaine course")}.

Ouvre ton pronostic :
{prediction_url}
"""
    html_body = f"""
    <html>
      <body style="margin:0;background:#0b0d12;color:#f4f4f4;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:36px 20px;">
          <div style="background:#121418;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:28px;">
            <p style="margin:0 0 8px;color:#e10600;font-weight:700;letter-spacing:.08em;">PRONOKIF</p>
            <h1 style="margin:0 0 14px;font-size:24px;color:#ffffff;">Ton pronostic t'attend</h1>
            <p style="margin:0 0 22px;color:#c9ced8;line-height:1.55;">
              Tu n'as pas encore finalise ton pronostic pour <strong>{safe_race_name}</strong>.
            </p>
            <a href="{safe_url}" style="display:inline-block;background:#e10600;color:#fff;
              padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
              Pronostiquer maintenant
            </a>
          </div>
        </div>
      </body>
    </html>
    """
    return await send_email(
        email,
        f"PronoKif - Rappel pronostic {race.get('name', '')}".strip(),
        text_body,
        html_body,
    )


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all users with pagination and search."""
    query = {}
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    total = await db.users.count_documents(query)
    users = (
        await db.users.find(query, {"_id": 0, "password_hash": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"users": users, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Get user detail with stats."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    pred_count = await db.predictions.count_documents({"user_id": user_id})
    leagues = await db.leagues.find(
        {"$or": [{"created_by": user_id}, {"members": user_id}]},
        {"_id": 0, "id": 1, "name": 1},
    ).to_list(20)

    return {**user, "predictions_count": pred_count, "leagues": leagues}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str, data: UserUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a user."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return {"message": "Utilisateur mis a jour"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a user and their data."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    if _is_protected_admin_user(user):
        raise HTTPException(
            status_code=403,
            detail="Impossible de supprimer un compte administrateur",
        )
    await db.users.delete_one({"id": user_id})
    await db.predictions.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "Utilisateur et donnees supprimes"}


# ═══════════════════════════════════════ CHAMPIONSHIPS CRUD ═══════════════════


class ChampionshipCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    season: int = Field(..., ge=2020, le=2030)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: bool = True


class ChampionshipUpdate(BaseModel):
    name: Optional[str] = None
    season: Optional[int] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/championships")
async def list_championships(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """List all championships."""
    return await db.championships.find({}, {"_id": 0}).sort("season", -1).to_list(100)


@router.post("/championships")
async def create_championship(
    data: ChampionshipCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new championship."""
    championship = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(UTC).isoformat(),
        "created_by": admin["email"],
    }
    await db.championships.insert_one(championship)
    return {"message": "Championnat cree", "id": championship["id"]}


@router.put("/championships/{champ_id}")
async def update_championship(
    champ_id: str, data: ChampionshipUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a championship."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    result = await db.championships.update_one({"id": champ_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouve")
    return {"message": "Championnat mis a jour"}


@router.delete("/championships/{champ_id}")
async def delete_championship(
    champ_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a championship."""
    result = await db.championships.delete_one({"id": champ_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Championnat non trouve")
    return {"message": "Championnat supprime"}


# ═══════════════════════════════════════ RACES CRUD ═══════════════════════════


class RaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: str  # ISO date string
    quali_date: Optional[str] = None
    fp1_date: Optional[str] = None
    fp1_time: Optional[str] = None
    fp2_date: Optional[str] = None
    fp2_time: Optional[str] = None
    fp3_date: Optional[str] = None
    fp3_time: Optional[str] = None
    quali_time: Optional[str] = None
    race_time: Optional[str] = None
    sprint_quali_date: Optional[str] = None
    sprint_quali_time: Optional[str] = None
    sprint_race_date: Optional[str] = None
    sprint_race_time: Optional[str] = None
    timezone: Optional[str] = None
    race_duration_minutes: int = Field(default=120, ge=1, le=1440)
    is_sprint: bool = False
    round_number: Optional[int] = None
    season: int = Field(..., ge=2020, le=2030)
    thumbnail_url: Optional[str] = None
    is_cancelled: bool = False
    is_test_race: bool = False


class RaceUpdate(BaseModel):
    name: Optional[str] = None
    circuit: Optional[str] = None
    country: Optional[str] = None
    date: Optional[str] = None
    quali_date: Optional[str] = None
    fp1_date: Optional[str] = None
    fp1_time: Optional[str] = None
    fp2_date: Optional[str] = None
    fp2_time: Optional[str] = None
    fp3_date: Optional[str] = None
    fp3_time: Optional[str] = None
    quali_time: Optional[str] = None
    race_time: Optional[str] = None
    sprint_quali_date: Optional[str] = None
    sprint_quali_time: Optional[str] = None
    sprint_race_date: Optional[str] = None
    sprint_race_time: Optional[str] = None
    timezone: Optional[str] = None
    race_duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    is_sprint: Optional[bool] = None
    round_number: Optional[int] = None
    season: Optional[int] = Field(default=None, ge=2020, le=2030)
    thumbnail_url: Optional[str] = None
    is_past: Optional[bool] = None
    is_cancelled: Optional[bool] = None
    is_test_race: Optional[bool] = None


class RaceReminderRequest(BaseModel):
    user_ids: Optional[list[str]] = None
    send_email: bool = True
    send_notification: bool = True


class DemoSeedRequest(BaseModel):
    confirm: str


@router.get("/races")
async def list_races(
    season: Optional[int] = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all races, optionally filtered by season."""
    query = {}
    if season:
        query["season"] = season
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
        race["submitted_predictions"] = submitted
        race["missing_predictions"] = 0 if race.get("is_cancelled") else max(total_users - submitted, 0)
        race["completion_rate"] = _completion_rate(submitted, total_users)
    return races


@router.post("/races/seed-2026")
async def seed_2026_races(admin: dict = Depends(get_current_admin)) -> dict:
    """Seed the editable back-office race calendar from the canonical 2026 data."""
    inserted = 0
    updated = 0
    now = _now_iso()

    for index, race in enumerate(active_2026_races(), start=1):
        race_doc = _race_doc_from_static(race, index)
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

    return {
        "message": "Calendrier 2026 synchronise",
        "inserted": inserted,
        "updated": updated,
        "existing": updated,
        "total": len(ACTIVE_2026_RACE_ORDER),
        "cancelled_results_removed": cancelled_results.deleted_count,
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
    return {
        "message": "Jeu de donnees demo synchronise",
        "seeded_by": admin.get("email"),
        "summary": summary,
    }


@router.post("/races")
async def create_race(
    data: RaceCreate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Create a new race event."""
    now = datetime.now(UTC).isoformat()
    race = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "timezone": data.timezone or "Europe/Paris",
        "race_time": data.race_time or "15:00",
        "quali_time": data.quali_time or "14:00",
        "race_duration_minutes": data.race_duration_minutes or 120,
        "is_past": False,
        "has_results": False,
        "created_at": now,
        "updated_at": now,
        "created_by": admin.get("email"),
    }
    race.update(race_timing_payload(race))
    await db.races.insert_one(race)
    return {"message": "Course creee", "id": race["id"]}


@router.put("/races/{race_id}")
async def update_race(
    race_id: str, data: RaceUpdate, admin: dict = Depends(get_current_admin)
) -> dict:
    """Update a race event."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")
    updates["updated_at"] = _now_iso()
    updates["updated_by"] = admin.get("email")
    result = await db.races.update_one({"id": race_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course non trouvee")
    return {"message": "Course mise a jour"}


@router.get("/races/{race_id}/predictions-overview")
async def get_race_predictions_overview(
    race_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Return prediction progress, submitted predictions, and missing users for a race."""
    return await _race_prediction_overview(race_id)


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
            "message": "Course annulee, aucun rappel envoye",
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
            "message": "Aucun joueur a relancer",
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
                "title": f"Pronostic attendu - {race.get('name', 'Course')}",
                "message": "Il te reste un pronostic a finaliser avant la cloture du week-end.",
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

    return {
        "message": "Rappels envoyes",
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
        raise HTTPException(status_code=404, detail="Course non trouvee")
    return {"message": "Course supprimee"}


# ═══════════════════════════════════════ PREDICTIONS ══════════════════════════


@router.get("/predictions")
async def list_predictions(
    user_id: Optional[str] = None,
    race_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List predictions with filters."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if race_id:
        query["race_id"] = race_id

    total = await db.predictions.count_documents(query)
    predictions = (
        await db.predictions.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"predictions": predictions, "total": total}


# ═══════════════════════════════════════ FEEDBACKS ════════════════════════════


@router.get("/feedbacks")
async def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """List all feedbacks."""
    query = {}
    if unread_only:
        query["read"] = False
    total = await db.feedback.count_documents(query)
    feedbacks = (
        await db.feedback.find(query, {"_id": 0})
        .skip(skip)
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    return {"feedbacks": feedbacks, "total": total}


@router.put("/feedbacks/{feedback_id}/read")
async def mark_feedback_read(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Mark feedback as read."""
    result = await db.feedback.update_one({"id": feedback_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    return {"message": "Marque comme lu"}


@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(
    feedback_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a feedback entry."""
    result = await db.feedback.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback non trouve")
    return {"message": "Feedback supprime"}
