"""
PRONOKIF - Admin Back-Office: Dashboard.

Business operations cockpit and dashboard stats.

Endpoints:
  GET    /admin-bo/business/operations - business-first operations cockpit
  GET    /admin-bo/stats               - dashboard statistics
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends

from config import db
from routes.admin_auth import get_current_admin
from services.race_calendar import (
    has_complete_race_results,
    race_timing_payload,
    race_with_circuit_timezone,
)

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-content"])


def _completion_rate(done: int, total: int) -> int:
    if total <= 0:
        return 0
    return min(100, round((done / total) * 100))


def _business_action_item(
    *,
    item_id: str,
    severity: str,
    area: str,
    title: str,
    description: str,
    target_tab: str,
    entity_id: str | None = None,
    metric: int | str | None = None,
) -> dict:
    return {
        "id": item_id,
        "severity": severity,
        "area": area,
        "title": title,
        "description": description,
        "target_tab": target_tab,
        "entity_id": entity_id,
        "metric": metric,
    }


def _business_ops_summary(action_items: list[dict]) -> dict:
    critical_count = len([item for item in action_items if item.get("severity") == "critical"])
    warning_count = len([item for item in action_items if item.get("severity") == "warning"])
    info_count = len([item for item in action_items if item.get("severity") == "info"])
    score = max(0, 100 - critical_count * 18 - warning_count * 7 - info_count * 2)
    return {
        "business_score": score,
        "attention_count": len(action_items),
        "critical_count": critical_count,
        "warning_count": warning_count,
        "info_count": info_count,
    }


def _race_ops_payload(
    race: dict,
    *,
    total_users: int,
    submitted: int,
    scored: int,
    has_results: bool,
) -> dict:
    missing = 0 if race.get("is_cancelled") else max(total_users - submitted, 0)
    scoring_pending = max(submitted - scored, 0) if has_results else 0
    return {
        "id": race.get("id"),
        "name": race.get("name"),
        "round_number": race.get("round_number"),
        "status": race.get("status"),
        "race_start_at": race.get("race_start_at"),
        "predictions_close_at": race.get("predictions_close_at"),
        "content_status": race.get("content_status") or "draft",
        "submitted_predictions": submitted,
        "missing_predictions": missing,
        "completion_rate": _completion_rate(submitted, total_users),
        "scored_predictions": scored,
        "scoring_pending": scoring_pending,
        "scoring_coverage_rate": _completion_rate(scored, submitted),
        "has_results": has_results,
    }


def _sort_business_items(items: list[dict]) -> list[dict]:
    order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(
        items,
        key=lambda item: (
            order.get(item.get("severity"), 9),
            item.get("area", ""),
            item.get("id", ""),
        ),
    )


# ═══════════════════════════════════════ STATS DASHBOARD ══════════════════════


async def _race_business_operations(now: datetime) -> tuple[list[dict], list[dict]]:
    races = await db.races.find({}, {"_id": 0}).sort("date", 1).to_list(200)
    active_user_ids = await db.users.distinct("id", {"is_banned": {"$ne": True}})
    total_users = len(active_user_ids)
    action_items: list[dict] = []
    race_rows: list[dict] = []

    for raw_race in races:
        race = race_with_circuit_timezone(raw_race)
        result_doc = await db.race_results.find_one({"race_id": race["id"]}, {"_id": 0, "results": 1})
        has_results = False if race.get("is_cancelled") else has_complete_race_results(result_doc)
        race.update(race_timing_payload(race, now=now, has_results=has_results))
        submitted = (
            await db.predictions.count_documents({"race_id": race["id"], "user_id": {"$in": active_user_ids}})
            if total_users
            else 0
        )
        scored = await db.prediction_scores.count_documents(
            {"score_type": "official_race", "race_id": race["id"]}
        )
        payload = _race_ops_payload(
            race,
            total_users=total_users,
            submitted=submitted,
            scored=scored,
            has_results=has_results,
        )
        race_rows.append(payload)

        if race.get("is_cancelled"):
            continue

        status = payload["status"]
        if status == "finished" and not has_results:
            action_items.append(
                _business_action_item(
                    item_id=f"race-results:{race['id']}",
                    severity="critical",
                    area="courses",
                    title="Résultats officiels manquants",
                    description=f"{race.get('name')} est terminée mais aucun résultat complet n'est enregistré.",
                    target_tab="races",
                    entity_id=race["id"],
                    metric="Résultats",
                )
            )
        if payload["scoring_pending"] > 0:
            action_items.append(
                _business_action_item(
                    item_id=f"race-scoring:{race['id']}",
                    severity="critical",
                    area="scoring",
                    title="Scoring incomplet",
                    description=(
                        f"{payload['scoring_pending']} pronostic(s) restent sans score officiel "
                        f"pour {race.get('name')}."
                    ),
                    target_tab="scoring",
                    entity_id=race["id"],
                    metric=payload["scoring_pending"],
                )
            )

        close_at = None
        if payload.get("predictions_close_at"):
            close_at = datetime.fromisoformat(str(payload["predictions_close_at"]))
        reminder_window = (
            status == "upcoming"
            and close_at
            and now <= close_at <= now + timedelta(days=3)
            and payload["missing_predictions"] > 0
        )
        if reminder_window:
            action_items.append(
                _business_action_item(
                    item_id=f"race-reminders:{race['id']}",
                    severity="warning",
                    area="courses",
                    title="Relances pronostics à prévoir",
                    description=(
                        f"{payload['missing_predictions']} joueur(s) n'ont pas encore "
                        f"pronostiqué {race.get('name')}."
                    ),
                    target_tab="races",
                    entity_id=race["id"],
                    metric=payload["completion_rate"],
                )
            )
        if status == "upcoming" and close_at and now <= close_at <= now + timedelta(days=14):
            content_status = str(payload.get("content_status") or "draft")
            if content_status not in {"ready", "published"}:
                action_items.append(
                    _business_action_item(
                        item_id=f"race-content:{race['id']}",
                        severity="warning",
                        area="courses",
                        title="Contenu GP à préparer",
                        description=f"L'angle éditorial de {race.get('name')} est encore en brouillon.",
                        target_tab="races",
                        entity_id=race["id"],
                        metric=content_status,
                    )
                )

    relevant_races = [
        race
        for race in race_rows
        if race.get("status") in {"upcoming", "in_progress", "finished"}
    ]
    return relevant_races[:8], action_items


async def _business_operations_payload() -> dict:
    now = datetime.now(UTC)
    race_rows, action_items = await _race_business_operations(now)

    unread_feedbacks = await db.feedback.count_documents({"read": False})
    urgent_feedbacks = await db.feedback.count_documents(
        {
            "priority": {"$in": ["urgent", "high"]},
            "status": {"$nin": ["resolved", "wont_fix"]},
        }
    )
    if urgent_feedbacks:
        action_items.append(
            _business_action_item(
                item_id="feedbacks:urgent",
                severity="warning",
                area="support",
                title="Retours prioritaires à traiter",
                description=f"{urgent_feedbacks} retour(s) urgent/haut sont encore ouverts.",
                target_tab="feedbacks",
                metric=urgent_feedbacks,
            )
        )
    elif unread_feedbacks:
        action_items.append(
            _business_action_item(
                item_id="feedbacks:unread",
                severity="info",
                area="support",
                title="Retours non lus",
                description=f"{unread_feedbacks} retour(s) utilisateurs attendent une lecture.",
                target_tab="feedbacks",
                metric=unread_feedbacks,
            )
        )

    now_iso = now.isoformat()
    expired_invitations = await db.invitations.count_documents(
        {"accepted": {"$ne": True}, "revoked": {"$ne": True}, "expires_at": {"$lt": now_iso}}
    )
    pending_invitations = await db.invitations.count_documents(
        {"accepted": {"$ne": True}, "revoked": {"$ne": True}, "expires_at": {"$gte": now_iso}}
    )
    if expired_invitations:
        action_items.append(
            _business_action_item(
                item_id="invitations:expired",
                severity="info",
                area="growth",
                title="Invitations expirées",
                description=f"{expired_invitations} invitation(s) peuvent être relancées ou nettoyées.",
                target_tab="invitations",
                metric=expired_invitations,
            )
        )

    unresolved_custom_predictions = await db.custom_predictions.count_documents(
        {"correct_answer": {"$exists": False}}
    )
    if unresolved_custom_predictions:
        action_items.append(
            _business_action_item(
                item_id="custom-predictions:unsettled",
                severity="info",
                area="ligues",
                title="Pronostics custom non scorés",
                description=f"{unresolved_custom_predictions} prono(s) custom attendent une réponse officielle.",
                target_tab="leagues",
                metric=unresolved_custom_predictions,
            )
        )

    knowledge_pending = await db.knowledge_documents.count_documents(
        {"embedding.status": {"$nin": ["ready", "manual"]}}
    )
    if knowledge_pending:
        action_items.append(
            _business_action_item(
                item_id="knowledge:embeddings",
                severity="info",
                area="rag",
                title="Base RAG à indexer",
                description=f"{knowledge_pending} document(s) de connaissance n'ont pas encore d'embedding prêt.",
                target_tab="knowledge",
                metric=knowledge_pending,
            )
        )

    legal_drafts = await db.legal_pages.count_documents({"status": {"$ne": "published"}})
    if legal_drafts:
        action_items.append(
            _business_action_item(
                item_id="legal:drafts",
                severity="info",
                area="legal",
                title="Pages légales non publiées",
                description=f"{legal_drafts} page(s) légales sont encore en brouillon ou revue.",
                target_tab="legal",
                metric=legal_drafts,
            )
        )

    sorted_items = _sort_business_items(action_items)
    return {
        "summary": _business_ops_summary(sorted_items),
        "generated_at": now_iso,
        "action_items": sorted_items[:20],
        "next_races": race_rows[:5],
        "metrics": {
            "unread_feedbacks": unread_feedbacks,
            "urgent_feedbacks": urgent_feedbacks,
            "pending_invitations": pending_invitations,
            "expired_invitations": expired_invitations,
            "unresolved_custom_predictions": unresolved_custom_predictions,
            "knowledge_pending": knowledge_pending,
            "legal_drafts": legal_drafts,
        },
    }


@router.get("/business/operations")
async def get_business_operations(admin: dict = Depends(get_current_admin)) -> dict:
    """Return a business-first admin cockpit with actionable operations priorities."""
    return await _business_operations_payload()


@router.get("/stats")
async def get_dashboard_stats(admin: dict = Depends(get_current_admin)) -> dict:
    """Get admin dashboard statistics."""
    total_users = await db.users.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    locked_predictions = await db.predictions.count_documents({"locked": True})
    predictions_to_review = await db.predictions.count_documents(
        {"review_status": {"$in": ["in_review", "needs_review", "flagged"]}}
    )
    total_leagues = await db.leagues.count_documents({})
    total_races = await db.races.count_documents({})
    total_championships = await db.championships.count_documents({})
    total_knowledge_entities = await db.knowledge_entities.count_documents({})
    total_knowledge_documents = await db.knowledge_documents.count_documents({})
    unread_feedbacks = await db.feedback.count_documents({"read": False})
    pending_invitations = await db.invitations.count_documents({"accepted": False})
    total_activity_logs = await db.admin_activity_logs.count_documents({})

    week_ago = (datetime.now(UTC) - timedelta(days=7)).isoformat()
    day_ago = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    predictions_week = await db.predictions.count_documents({"created_at": {"$gte": week_ago}})
    predictions_day = await db.predictions.count_documents({"created_at": {"$gte": day_ago}})
    activity_day = await db.admin_activity_logs.count_documents({"created_at": {"$gte": day_ago}})
    recent_activity_logs = (
        await db.admin_activity_logs.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(5)
        .to_list(5)
    )

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "locked_predictions": locked_predictions,
        "predictions_to_review": predictions_to_review,
        "predictions_week": predictions_week,
        "predictions_day": predictions_day,
        "total_leagues": total_leagues,
        "total_races": total_races,
        "total_championships": total_championships,
        "total_knowledge_entities": total_knowledge_entities,
        "total_knowledge_documents": total_knowledge_documents,
        "unread_feedbacks": unread_feedbacks,
        "pending_invitations": pending_invitations,
        "total_activity_logs": total_activity_logs,
        "activity_day": activity_day,
        "recent_activity_logs": recent_activity_logs,
        "new_users_week": new_users_week,
    }
