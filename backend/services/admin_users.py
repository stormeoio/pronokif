from __future__ import annotations

from collections.abc import Iterable

from config import db
from routes.admin_auth import ADMIN_EMAILS
from services.admin_predictions import enrich_prediction_docs, user_prediction_stats_from_payloads


def is_protected_admin_user(user: dict, admin_emails: Iterable[str] | None = None) -> bool:
    email = str(user.get("email", "")).strip().lower()
    protected_emails = admin_emails if admin_emails is not None else ADMIN_EMAILS
    return bool(email and email in {str(admin_email).strip().lower() for admin_email in protected_emails})


def users_search_query(search: str = "") -> dict:
    if not search:
        return {}
    return {
        "$or": [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    }


def user_analytics_from_docs(
    users: list[dict],
    predictions: list[dict],
    leagues: list[dict] | None = None,
) -> dict:
    predictions_by_user: dict[str, list[dict]] = {}
    for prediction in predictions:
        user_id = prediction.get("user_id")
        if user_id:
            predictions_by_user.setdefault(user_id, []).append(prediction)

    leagues_count_by_user: dict[str, int] = {}
    owned_leagues_by_user: dict[str, int] = {}
    for league in leagues or []:
        owner_id = league.get("created_by")
        if owner_id:
            owned_leagues_by_user[owner_id] = owned_leagues_by_user.get(owner_id, 0) + 1
            leagues_count_by_user[owner_id] = leagues_count_by_user.get(owner_id, 0) + 1
        for member_id in league.get("members") or []:
            if member_id != owner_id:
                leagues_count_by_user[member_id] = leagues_count_by_user.get(member_id, 0) + 1

    rows = []
    for user in users:
        user_id = user.get("id")
        user_predictions = predictions_by_user.get(user_id, [])
        stats = user_prediction_stats_from_payloads(user_predictions)
        last_prediction_at = None
        if user_predictions:
            latest_prediction = max(
                user_predictions,
                key=lambda prediction: str(
                    prediction.get("updated_at") or prediction.get("created_at") or ""
                ),
            )
            last_prediction_at = latest_prediction.get("updated_at") or latest_prediction.get("created_at")

        rows.append(
            {
                "user_id": user_id,
                "email": user.get("email"),
                "username": user.get("username"),
                "avatar_id": user.get("avatar_id"),
                "custom_avatar_url": user.get("custom_avatar_url"),
                "created_at": user.get("created_at"),
                "level": user.get("level"),
                "xp": user.get("xp"),
                "is_banned": bool(user.get("is_banned")),
                "last_login_at": user.get("last_login_at"),
                "last_prediction_at": last_prediction_at,
                "leagues_count": leagues_count_by_user.get(user_id, 0),
                "owned_leagues_count": owned_leagues_by_user.get(user_id, 0),
                **stats,
            }
        )

    users_count = len(rows)
    total_predictions = sum(row["predictions_count"] for row in rows)
    total_points = sum(row["total_points"] for row in rows)
    users_with_predictions = len([row for row in rows if row["predictions_count"] > 0])
    rows.sort(
        key=lambda row: (
            -row["total_points"],
            -row["complete_predictions"],
            str(row.get("email") or ""),
        )
    )

    return {
        "summary": {
            "users_count": users_count,
            "banned_users": len([row for row in rows if row["is_banned"]]),
            "users_with_predictions": users_with_predictions,
            "users_without_predictions": max(users_count - users_with_predictions, 0),
            "total_predictions": total_predictions,
            "total_points": total_points,
            "average_predictions_per_user": round(total_predictions / users_count, 1) if users_count else 0,
            "average_points_per_user": round(total_points / users_count, 1) if users_count else 0,
        },
        "users": rows,
        "top_users": [row for row in rows if row["predictions_count"] > 0][:20],
        "inactive_users": [row for row in rows if row["predictions_count"] == 0][:20],
    }


async def user_admin_stats(user_id: str, user: dict | None = None) -> dict:
    user_doc = user or await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    user_email = str((user_doc or {}).get("email") or "").strip().lower()
    predictions = await db.predictions.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    enriched_predictions = await enrich_prediction_docs(predictions)
    stats = user_prediction_stats_from_payloads(enriched_predictions)
    leagues = await db.leagues.find(
        {"$or": [{"created_by": user_id}, {"members": user_id}]},
        {"_id": 0, "id": 1, "name": 1, "created_by": 1, "members": 1, "created_at": 1},
    ).to_list(50)
    leaderboard_entries = await db.leaderboard.find(
        {"user_id": user_id},
        {
            "_id": 0,
            "league_id": 1,
            "championship_id": 1,
            "total_points": 1,
            "last_race_points": 1,
            "previous_position": 1,
        },
    ).to_list(100)
    league_names = {league.get("id"): league.get("name") for league in leagues if league.get("id")}
    for entry in leaderboard_entries:
        entry["league_name"] = league_names.get(entry.get("league_id"))

    activity_logs = await db.admin_activity_logs.find(
        {"$or": [{"entity_type": "user", "entity_id": user_id}, {"metadata.user_id": user_id}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    feedback_query = {"user_id": user_id}
    if user_email:
        feedback_query = {"$or": [{"user_id": user_id}, {"email": user_email}]}
    feedbacks = await db.feedback.find(feedback_query, {"_id": 0}).sort("created_at", -1).to_list(20)

    notification_query = {
        "$or": [
            {"user_id": user_id},
            {"target_user_ids": user_id},
            {"target_user_ids": {"$exists": False}, "user_id": {"$exists": False}},
        ]
    }
    notifications = await db.notifications.find(
        notification_query,
        {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    unread_ids = set((user_doc or {}).get("unread_notifications") or [])
    for notification in notifications:
        notification["is_read"] = notification.get("id") not in unread_ids

    support_messages = (
        await db.league_messages.find({"user_id": user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(20)
        .to_list(20)
    )
    for message in support_messages:
        message["league_name"] = league_names.get(message.get("league_id"))

    invitation_query = {"email": user_email} if user_email else {"email": "__no_email__"}
    invitations = (
        await db.invitations.find(invitation_query, {"_id": 0, "token": 0})
        .sort("created_at", -1)
        .limit(20)
        .to_list(20)
    )

    sorted_predictions = sorted(
        enriched_predictions,
        key=lambda prediction: str(prediction.get("updated_at") or prediction.get("created_at") or ""),
        reverse=True,
    )
    last_prediction_at = (
        sorted_predictions[0].get("updated_at") or sorted_predictions[0].get("created_at")
        if sorted_predictions
        else None
    )
    leaderboard_points = sum(entry.get("total_points", 0) for entry in leaderboard_entries)

    return {
        **stats,
        "last_prediction_at": last_prediction_at,
        "leagues_count": len(leagues),
        "owned_leagues_count": len([league for league in leagues if league.get("created_by") == user_id]),
        "leaderboard_points": leaderboard_points,
        "leaderboard_entries": leaderboard_entries,
        "recent_predictions": sorted_predictions[:8],
        "recent_activity": activity_logs,
        "feedbacks": feedbacks,
        "notifications": notifications,
        "support_messages": support_messages,
        "invitations": invitations,
        "leagues": leagues[:20],
    }


async def users_admin_analytics(search: str = "", limit: int = 5000) -> dict:
    query = users_search_query(search.strip())
    users = (
        await db.users.find(query, {"_id": 0, "password_hash": 0})
        .limit(limit)
        .sort("created_at", -1)
        .to_list(limit)
    )
    user_ids = [user["id"] for user in users if user.get("id")]
    predictions = []
    leagues = []
    if user_ids:
        raw_predictions = await db.predictions.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0},
        ).limit(5000).to_list(5000)
        predictions = await enrich_prediction_docs(raw_predictions)
        leagues = await db.leagues.find(
            {"$or": [{"created_by": {"$in": user_ids}}, {"members": {"$in": user_ids}}]},
            {"_id": 0, "id": 1, "created_by": 1, "members": 1},
        ).limit(5000).to_list(5000)
    return user_analytics_from_docs(users, predictions, leagues)
