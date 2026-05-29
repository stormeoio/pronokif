from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from config import db
from services.admin_activity import _now_iso
from services.admin_races import race_doc_from_static
from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.race_calendar import (
    ACTIVE_2026_CALENDAR_OVERRIDES,
    active_2026_races,
    race_with_circuit_timezone,
)
from services.scoring import calculate_points
from services.scoring_reconciliation import score_championship_query


def _and_query(*clauses: dict | None) -> dict:
    filtered = [clause for clause in clauses if clause]
    if not filtered:
        return {}
    if len(filtered) == 1:
        return filtered[0]
    return {"$and": filtered}


def linked_entity_query(championship_id: str, race_ids: list[str]) -> dict:
    race_query = {"race_id": {"$in": race_ids}} if race_ids else {"race_id": {"$in": []}}
    return {
        "$or": [
            {"championship_id": championship_id},
            {
                **race_query,
                "championship_id": {"$exists": False},
            },
        ]
    }


def _score_text_query(q: str, fields: list[str]) -> dict | None:
    value = q.strip()
    if not value:
        return None
    return {"$or": [{field: {"$regex": value, "$options": "i"}} for field in fields]}


def _official_score_query(
    *,
    championship_id: str | None = None,
    user_id: str | None = None,
    race_id: str | None = None,
    q: str = "",
) -> dict:
    return _and_query(
        {"score_type": "official_race"},
        score_championship_query(championship_id) if championship_id else None,
        {"user_id": user_id} if user_id else None,
        {"race_id": race_id} if race_id else None,
        _score_text_query(q, ["id", "prediction_id", "race_id", "user_id", "scored_by", "details"]),
    )


def _custom_score_query(
    *,
    championship_id: str | None = None,
    user_id: str | None = None,
    race_id: str | None = None,
    league_id: str | None = None,
    q: str = "",
) -> dict:
    return _and_query(
        {"points_awarded": {"$exists": True}},
        score_championship_query(championship_id) if championship_id else None,
        {"user_id": user_id} if user_id else None,
        {"race_id": race_id} if race_id else None,
        {"league_id": league_id} if league_id else None,
        _score_text_query(q, ["prediction_id", "race_id", "league_id", "user_id", "scored_by"]),
    )


def score_ledger_summary(rows: list[dict]) -> dict:
    official_rows = [row for row in rows if row.get("source") == "official_race"]
    custom_rows = [row for row in rows if row.get("source") == "custom_prediction"]
    return {
        "total_rows": len(rows),
        "official_rows": len(official_rows),
        "custom_rows": len(custom_rows),
        "points_total": sum(int(row.get("points") or 0) for row in rows),
        "xp_total": sum(int(row.get("xp_awarded") or 0) for row in rows),
        "custom_correct": len([row for row in custom_rows if row.get("is_correct") is True]),
    }


def normalize_score_type(score_type: str) -> str:
    normalized = (score_type or "all").strip()
    if normalized not in {"all", "official_race", "custom_prediction"}:
        raise HTTPException(status_code=400, detail="Type de score invalide")
    return normalized


def _score_ledger_sort_key(row: dict) -> tuple[str, str]:
    return (str(row.get("scored_at") or row.get("answered_at") or ""), str(row.get("id") or ""))


def score_ledger_row(
    row: dict,
    *,
    source: str,
    users_by_id: dict[str, dict],
    races_by_id: dict[str, dict],
    leagues_by_id: dict[str, dict],
    custom_predictions_by_id: dict[str, dict],
) -> dict:
    user = users_by_id.get(row.get("user_id") or "", {})
    race = races_by_id.get(row.get("race_id") or "", {})
    league = leagues_by_id.get(row.get("league_id") or "", {})
    custom_prediction = custom_predictions_by_id.get(row.get("prediction_id") or "", {})
    if source == "official_race":
        score_id = row.get("id") or f"official:{row.get('prediction_id') or row.get('user_id')}:{row.get('race_id')}"
        points = int(row.get("points_total") or 0)
        scored_at = row.get("scored_at")
        scored_by = row.get("scored_by")
        title = race.get("name") or row.get("race_id")
    else:
        score_id = row.get("id") or f"custom:{row.get('prediction_id')}:{row.get('user_id')}"
        points = int(row.get("points_awarded") or 0)
        scored_at = row.get("scored_at")
        scored_by = custom_prediction.get("scored_by") or row.get("scored_by")
        title = custom_prediction.get("question") or custom_prediction.get("title") or row.get("prediction_id")

    return {
        "id": score_id,
        "source": source,
        "prediction_id": row.get("prediction_id"),
        "user_id": row.get("user_id"),
        "user_email": user.get("email"),
        "user_username": user.get("username"),
        "race_id": row.get("race_id"),
        "race_name": race.get("name"),
        "league_id": row.get("league_id"),
        "league_name": league.get("name"),
        "championship_id": row.get("championship_id"),
        "season": row.get("season"),
        "title": title,
        "points": points,
        "xp_awarded": int(row.get("xp_awarded") or 0),
        "is_correct": row.get("is_correct"),
        "scored_at": scored_at,
        "scored_by": scored_by,
        "answered_at": row.get("answered_at"),
        "answer": row.get("answer"),
        "correct_answer": row.get("correct_answer_snapshot") or custom_prediction.get("correct_answer"),
        "details": row.get("details") or [],
        "breakdown": row.get("breakdown") or {},
    }


async def score_ledger_rows(
    *,
    score_type: str = "all",
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    user_id: str | None = None,
    race_id: str | None = None,
    league_id: str | None = None,
    q: str = "",
    limit: int = 100,
) -> list[dict]:
    normalized_type = (score_type or "all").strip()
    include_official = normalized_type in {"all", "official_race"} and not league_id
    include_custom = normalized_type in {"all", "custom_prediction"}
    fetch_limit = min(max(limit, 1), 5000)

    official_scores: list[dict] = []
    custom_scores: list[dict] = []
    if include_official:
        official_scores = await db.prediction_scores.find(
            _official_score_query(
                championship_id=championship_id,
                user_id=user_id,
                race_id=race_id,
                q=q,
            ),
            {"_id": 0},
        ).sort("scored_at", -1).to_list(fetch_limit)
    if include_custom:
        custom_scores = await db.custom_prediction_answers.find(
            _custom_score_query(
                championship_id=championship_id,
                user_id=user_id,
                race_id=race_id,
                league_id=league_id,
                q=q,
            ),
            {"_id": 0},
        ).sort("scored_at", -1).to_list(fetch_limit)

    user_ids = {row.get("user_id") for row in [*official_scores, *custom_scores] if row.get("user_id")}
    race_ids = {row.get("race_id") for row in [*official_scores, *custom_scores] if row.get("race_id")}
    league_ids = {row.get("league_id") for row in custom_scores if row.get("league_id")}
    custom_prediction_ids = {row.get("prediction_id") for row in custom_scores if row.get("prediction_id")}

    users = await db.users.find(
        {"id": {"$in": list(user_ids)}} if user_ids else {"id": {"$in": []}},
        {"_id": 0, "id": 1, "email": 1, "username": 1},
    ).to_list(len(user_ids) or 1)
    races = await db.races.find(
        {"id": {"$in": list(race_ids)}} if race_ids else {"id": {"$in": []}},
        {"_id": 0, "id": 1, "name": 1, "date": 1},
    ).to_list(len(race_ids) or 1)
    leagues = await db.leagues.find(
        {"id": {"$in": list(league_ids)}} if league_ids else {"id": {"$in": []}},
        {"_id": 0, "id": 1, "name": 1},
    ).to_list(len(league_ids) or 1)
    custom_predictions = await db.custom_predictions.find(
        {"id": {"$in": list(custom_prediction_ids)}} if custom_prediction_ids else {"id": {"$in": []}},
        {"_id": 0, "id": 1, "question": 1, "title": 1, "correct_answer": 1, "scored_by": 1},
    ).to_list(len(custom_prediction_ids) or 1)

    users_by_id = {user["id"]: user for user in users if user.get("id")}
    races_by_id = {race["id"]: race for race in races if race.get("id")}
    leagues_by_id = {league["id"]: league for league in leagues if league.get("id")}
    custom_predictions_by_id = {
        prediction["id"]: prediction for prediction in custom_predictions if prediction.get("id")
    }

    rows = [
        score_ledger_row(
            row,
            source="official_race",
            users_by_id=users_by_id,
            races_by_id=races_by_id,
            leagues_by_id=leagues_by_id,
            custom_predictions_by_id=custom_predictions_by_id,
        )
        for row in official_scores
    ] + [
        score_ledger_row(
            row,
            source="custom_prediction",
            users_by_id=users_by_id,
            races_by_id=races_by_id,
            leagues_by_id=leagues_by_id,
            custom_predictions_by_id=custom_predictions_by_id,
        )
        for row in custom_scores
    ]
    return sorted(rows, key=_score_ledger_sort_key, reverse=True)


def prediction_is_complete(prediction: dict, race: dict) -> bool:
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


def prediction_missing_fields(prediction: dict, race: dict) -> list[str]:
    missing = []
    required_fields: list[tuple[str, str, int | None]] = [
        ("quali_pole", "Pole qualifications", None),
        ("quali_top10", "Top 10 qualifications", 10),
        ("race_winner", "Vainqueur course", None),
        ("race_top10", "Top 10 course", 10),
    ]
    if race.get("is_sprint"):
        required_fields.extend(
            [
                ("sprint_quali_pole", "Pole sprint", None),
                ("sprint_quali_top10", "Top 10 qualifications sprint", 10),
                ("sprint_race_winner", "Vainqueur sprint", None),
                ("sprint_race_top10", "Top 10 course sprint", 10),
            ]
        )

    for field, label, expected_len in required_fields:
        value = prediction.get(field)
        if expected_len is None:
            if not value:
                missing.append(label)
        elif len(value or []) != expected_len:
            missing.append(label)
    return missing


def prediction_score_preview(prediction: dict, result_doc: dict | None) -> dict | None:
    results = (result_doc or {}).get("results") or {}
    if not results:
        return None
    points = calculate_points(prediction, results)
    return {
        "total": points["total"],
        "xp_earned": points["xp_earned"],
        "breakdown": {
            "quali_pole": points["quali_pole"],
            "quali_top10": points["quali_top10"],
            "sprint_quali_top10": points["sprint_quali_top10"],
            "sprint_race_top10": points["sprint_race_top10"],
            "race_winner": points["race_winner"],
            "race_top10": points["race_top10"],
            "bonus": points["bonus"],
        },
        "details": points["details"],
    }


def prediction_admin_payload(
    prediction: dict,
    *,
    user: dict | None = None,
    race: dict | None = None,
    result_doc: dict | None = None,
) -> dict:
    race_doc = race or {}
    user_doc = user or {}
    missing_fields = prediction_missing_fields(prediction, race_doc)
    score_preview = prediction_score_preview(prediction, result_doc)
    return {
        **prediction,
        "user": {
            "id": user_doc.get("id") or prediction.get("user_id"),
            "email": user_doc.get("email"),
            "username": user_doc.get("username"),
            "level": user_doc.get("level"),
            "xp": user_doc.get("xp"),
        },
        "user_email": user_doc.get("email"),
        "user_username": user_doc.get("username"),
        "race": {
            "id": race_doc.get("id") or prediction.get("race_id"),
            "name": race_doc.get("name"),
            "date": race_doc.get("date"),
            "country": race_doc.get("country"),
            "circuit": race_doc.get("circuit"),
            "is_sprint": bool(race_doc.get("is_sprint")),
            "championship_id": race_doc.get("championship_id"),
        },
        "race_name": race_doc.get("name"),
        "race_date": race_doc.get("date"),
        "is_complete": not missing_fields,
        "completion_status": "complete" if not missing_fields else "incomplete",
        "missing_fields": missing_fields,
        "score_preview": score_preview,
        "score_total": score_preview["total"] if score_preview else None,
        "has_results": bool(score_preview),
    }


def prediction_summary_from_payloads(predictions: list[dict]) -> dict:
    users = {prediction.get("user_id") for prediction in predictions if prediction.get("user_id")}
    return {
        "total": len(predictions),
        "complete": len([p for p in predictions if p.get("is_complete")]),
        "incomplete": len([p for p in predictions if not p.get("is_complete")]),
        "locked": len([p for p in predictions if p.get("locked")]),
        "unlocked": len([p for p in predictions if not p.get("locked")]),
        "scored": len([p for p in predictions if p.get("score_preview")]),
        "users_count": len(users),
    }


def user_prediction_stats_from_payloads(predictions: list[dict]) -> dict:
    scored_predictions = [p for p in predictions if p.get("score_preview")]
    total_points = sum((p.get("score_preview") or {}).get("total", 0) for p in scored_predictions)
    best_prediction = None
    if scored_predictions:
        best_prediction = max(scored_predictions, key=lambda p: (p.get("score_preview") or {}).get("total", 0))
    return {
        "predictions_count": len(predictions),
        "complete_predictions": len([p for p in predictions if p.get("is_complete")]),
        "incomplete_predictions": len([p for p in predictions if not p.get("is_complete")]),
        "locked_predictions": len([p for p in predictions if p.get("locked")]),
        "scored_predictions": len(scored_predictions),
        "total_points": total_points,
        "average_points": round(total_points / len(scored_predictions), 1) if scored_predictions else 0,
        "best_race": (
            {
                "race_id": best_prediction.get("race_id"),
                "race_name": best_prediction.get("race_name"),
                "points": (best_prediction.get("score_preview") or {}).get("total", 0),
            }
            if best_prediction
            else None
        ),
    }


def prediction_analytics_from_payloads(predictions: list[dict]) -> dict:
    by_race: dict[str, dict] = {}
    by_user: dict[str, dict] = {}
    review_queue: dict[str, int] = {}

    for prediction in predictions:
        score = (prediction.get("score_preview") or {}).get("total")
        race_id = prediction.get("race_id") or "unknown-race"
        race_bucket = by_race.setdefault(
            race_id,
            {
                "race_id": race_id,
                "race_name": prediction.get("race_name"),
                "race_date": prediction.get("race_date"),
                "total": 0,
                "complete": 0,
                "incomplete": 0,
                "locked": 0,
                "scored": 0,
                "points_total": 0,
            },
        )
        race_bucket["total"] += 1
        race_bucket["complete" if prediction.get("is_complete") else "incomplete"] += 1
        race_bucket["locked"] += 1 if prediction.get("locked") else 0
        if score is not None:
            race_bucket["scored"] += 1
            race_bucket["points_total"] += score

        user_id = prediction.get("user_id") or "unknown-user"
        user_bucket = by_user.setdefault(
            user_id,
            {
                "user_id": user_id,
                "user_email": prediction.get("user_email"),
                "user_username": prediction.get("user_username"),
                "predictions_count": 0,
                "complete_predictions": 0,
                "scored_predictions": 0,
                "total_points": 0,
            },
        )
        user_bucket["predictions_count"] += 1
        user_bucket["complete_predictions"] += 1 if prediction.get("is_complete") else 0
        if score is not None:
            user_bucket["scored_predictions"] += 1
            user_bucket["total_points"] += score

        review_status = prediction.get("review_status") or "none"
        review_queue[review_status] = review_queue.get(review_status, 0) + 1

    race_rows = []
    for bucket in by_race.values():
        scored = bucket["scored"]
        race_rows.append(
            {
                **bucket,
                "average_points": round(bucket["points_total"] / scored, 1) if scored else 0,
            }
        )
    race_rows.sort(key=lambda race: (str(race.get("race_date") or ""), str(race.get("race_name") or "")))

    user_rows = []
    for bucket in by_user.values():
        scored = bucket["scored_predictions"]
        user_rows.append(
            {
                **bucket,
                "average_points": round(bucket["total_points"] / scored, 1) if scored else 0,
            }
        )
    user_rows.sort(
        key=lambda user: (
            -user["total_points"],
            -user["complete_predictions"],
            str(user.get("user_email") or ""),
        )
    )

    return {
        "summary": prediction_summary_from_payloads(predictions),
        "by_race": race_rows,
        "top_users": user_rows[:20],
        "review_queue": review_queue,
    }


async def get_admin_race(race_id: str) -> dict:
    race = await db.races.find_one({"id": race_id}, {"_id": 0})
    if race:
        return race_with_circuit_timezone(race)
    static_race = next((r for r in active_2026_races() if r["id"] == race_id), None)
    if static_race:
        return race_doc_from_static(
            static_race,
            ACTIVE_2026_CALENDAR_OVERRIDES.get(race_id, {}).get("round_number", 1),
        )
    raise HTTPException(status_code=404, detail="Course introuvable")


async def enrich_prediction_docs(predictions: list[dict]) -> list[dict]:
    if not predictions:
        return []

    user_ids = list({prediction.get("user_id") for prediction in predictions if prediction.get("user_id")})
    race_ids = list({prediction.get("race_id") for prediction in predictions if prediction.get("race_id")})

    users_by_id = {}
    if user_ids:
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "email": 1, "username": 1, "level": 1, "xp": 1},
        ).to_list(len(user_ids))
        users_by_id = {user["id"]: user for user in users}

    races_by_id = {}
    if race_ids:
        races = await db.races.find({"id": {"$in": race_ids}}, {"_id": 0}).to_list(len(race_ids))
        races_by_id = {race["id"]: race_with_circuit_timezone(race) for race in races}
        for race_id in race_ids:
            if race_id not in races_by_id:
                try:
                    races_by_id[race_id] = await get_admin_race(race_id)
                except HTTPException:
                    continue

    results_by_race = {}
    if race_ids:
        result_docs = await db.race_results.find(
            {"race_id": {"$in": race_ids}},
            {"_id": 0},
        ).to_list(len(race_ids))
        results_by_race = {result["race_id"]: result for result in result_docs}

    return [
        prediction_admin_payload(
            prediction,
            user=users_by_id.get(prediction.get("user_id")),
            race=races_by_id.get(prediction.get("race_id")),
            result_doc=results_by_race.get(prediction.get("race_id")),
        )
        for prediction in predictions
    ]


def validate_prediction_admin_update(updates: dict) -> None:
    for field in ("quali_top10", "race_top10", "sprint_quali_top10", "sprint_race_top10"):
        if field in updates and updates[field] is not None and len(updates[field]) > 20:
            raise HTTPException(status_code=400, detail=f"{field} ne peut pas dépasser 20 pilotes")


def prediction_batch_update_payload(data: Any, admin: dict) -> dict[str, Any]:
    now = _now_iso()
    if data.action == "lock":
        return {
            "locked": True,
            "locked_at": now,
            "locked_by": admin.get("email"),
            "lock_reason": data.reason,
            "updated_at": now,
        }
    if data.action == "unlock":
        return {
            "locked": False,
            "locked_at": None,
            "locked_by": None,
            "lock_reason": data.reason,
            "updated_at": now,
        }
    if data.action == "set_review_status":
        if not data.review_status:
            raise HTTPException(status_code=400, detail="Statut de revue requis")
        return {
            "review_status": data.review_status,
            "reviewed_at": now,
            "reviewed_by": admin.get("email"),
            "updated_at": now,
        }
    raise HTTPException(status_code=400, detail="Action de masse non supportée")


async def _prediction_query_from_admin_filters(
    *,
    user_id: str | None,
    race_id: str | None,
    championship_id: str | None,
    q: str,
    review_status: str | None,
    locked: bool | None,
) -> dict:
    query: dict[str, Any] = {}
    if user_id:
        query["user_id"] = user_id
    if race_id:
        query["race_id"] = race_id
    if review_status:
        query["review_status"] = review_status
    if locked is not None:
        query["locked"] = locked
    if championship_id:
        race_ids = await db.races.distinct("id", {"championship_id": championship_id})
        query = {"$and": [query, linked_entity_query(championship_id, race_ids)]}

    if q:
        user_ids = await db.users.distinct(
            "id",
            {
                "$or": [
                    {"username": {"$regex": q, "$options": "i"}},
                    {"email": {"$regex": q, "$options": "i"}},
                ]
            },
        )
        race_ids = await db.races.distinct(
            "id",
            {
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"circuit": {"$regex": q, "$options": "i"}},
                    {"country": {"$regex": q, "$options": "i"}},
                ]
            },
        )
        search_query = {
            "$or": [
                {"id": {"$regex": q, "$options": "i"}},
                {"user_id": {"$in": user_ids}},
                {"race_id": {"$in": race_ids}},
            ]
        }
        query = {"$and": [query, search_query]} if query else search_query

    return query


async def filtered_admin_predictions(
    *,
    user_id: str | None = None,
    race_id: str | None = None,
    championship_id: str | None = None,
    q: str = "",
    status: str | None = None,
    review_status: str | None = None,
    locked: bool | None = None,
    skip: int = 0,
    limit: int = 50,
    force_full_status_scan: bool = False,
) -> dict:
    limit = min(max(limit, 1), 5000)
    skip = max(skip, 0)
    query = await _prediction_query_from_admin_filters(
        user_id=user_id,
        race_id=race_id,
        championship_id=championship_id,
        q=q.strip(),
        review_status=review_status,
        locked=locked,
    )

    needs_manual_status_filter = status in {"complete", "incomplete", "scored", "unscored"}
    raw_limit = 5000 if (needs_manual_status_filter or force_full_status_scan) else min(limit, 100)
    raw_skip = 0 if (needs_manual_status_filter or force_full_status_scan) else skip
    raw_predictions = (
        await db.predictions.find(query, {"_id": 0})
        .skip(raw_skip)
        .limit(raw_limit)
        .sort("created_at", -1)
        .to_list(raw_limit)
    )
    predictions = await enrich_prediction_docs(raw_predictions)

    if status == "complete":
        predictions = [prediction for prediction in predictions if prediction.get("is_complete")]
    elif status == "incomplete":
        predictions = [prediction for prediction in predictions if not prediction.get("is_complete")]
    elif status == "scored":
        predictions = [prediction for prediction in predictions if prediction.get("score_preview")]
    elif status == "unscored":
        predictions = [prediction for prediction in predictions if not prediction.get("score_preview")]

    if needs_manual_status_filter or force_full_status_scan:
        total = len(predictions)
        page_predictions = predictions[skip : skip + limit]
        summary_predictions = predictions
    else:
        total = await db.predictions.count_documents(query)
        page_predictions = predictions
        summary_predictions = predictions
        if skip > 0 or total > len(predictions):
            summary_raw_predictions = (
                await db.predictions.find(query, {"_id": 0})
                .limit(5000)
                .sort("created_at", -1)
                .to_list(5000)
            )
            summary_predictions = await enrich_prediction_docs(summary_raw_predictions)

    return {
        "predictions": page_predictions,
        "all_predictions": (
            predictions
            if (needs_manual_status_filter or force_full_status_scan)
            else summary_predictions
        ),
        "total": total,
        "skip": skip,
        "limit": limit,
        "summary": prediction_summary_from_payloads(summary_predictions),
    }
