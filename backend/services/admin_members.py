"""
PRONOKIF - Admin members management service.

Pure business logic for the admin "members" surface, decoupled from HTTP.
Lets routes/admin_members.py stay slim (auth dependency, response shaping)
and gives tests a seam without spinning up a FastAPI client.

All functions assume the caller has already enforced admin access (the
route layer wires `Depends(require_admin)`).
"""

from __future__ import annotations

from config import db, logger
from features import get_default_user_stats
from services.predictions import count_individual_predictions
from services.race_calendar import active_2026_races


class MemberNotFoundError(LookupError):
    """Raised when the targeted member id does not exist. The route layer
    converts this to a 404 Not Found."""


class CannotDeleteSelfError(ValueError):
    """Raised when an admin tries to delete their own account. The route
    layer converts this to a 400 Bad Request."""


async def list_all(limit: int = 1000) -> list[dict]:
    """Return all registered members enriched with prediction + league counts."""
    members = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(limit)

    for member in members:
        member["predictions_count"] = await count_individual_predictions(member["id"])
        member["leagues_count"] = await db.leagues.count_documents({"members": member["id"]})

    return members


async def get_details(member_id: str) -> dict:
    """Return a detailed member profile (stats, leagues, recent predictions,
    minigame scores). Raises MemberNotFoundError if unknown."""
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise MemberNotFoundError(member_id)

    stats = await db.user_stats.find_one({"user_id": member_id}, {"_id": 0})
    if not stats:
        stats = get_default_user_stats()

    predictions_count = await count_individual_predictions(member_id)
    races_participated = await db.predictions.count_documents({"user_id": member_id})

    leagues = await db.leagues.find({"members": member_id}, {"_id": 0}).to_list(100)

    recent_predictions = await (
        db.predictions.find({"user_id": member_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    )

    race_map = {r["id"]: r["name"] for r in active_2026_races()}
    for pred in recent_predictions:
        pred["race_name"] = race_map.get(pred["race_id"], pred["race_id"])

    minigame_scores = await (
        db.minigame_scores.find({"user_id": member_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    )

    return {
        "id": member["id"],
        "email": member.get("email"),
        "username": member.get("username", "Anonymous"),
        "avatar_id": member.get("avatar_id"),
        "custom_avatar_url": member.get("custom_avatar_url"),
        "level": member.get("level", 1),
        "xp": member.get("xp", 0),
        "created_at": member.get("created_at"),
        "current_league_id": member.get("current_league_id"),
        "stats": {
            "predictions_count": predictions_count,
            "correct_poles": stats.get("correct_poles", stats.get("poles_correct", 0)),
            "correct_winners": stats.get("correct_winners", stats.get("winners_correct", 0)),
            "perfect_top10": stats.get("perfect_top10", 0),
            "races_participated": races_participated,
        },
        "leagues": [
            {
                "id": league["id"],
                "name": league["name"],
                "members_count": len(league["members"]),
            }
            for league in leagues
        ],
        "recent_predictions": recent_predictions,
        "minigame_scores": minigame_scores,
    }


async def get_activity(member_id: str, limit: int = 50) -> dict:
    """Return login activity history for a given member.
    Raises MemberNotFoundError if unknown."""
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise MemberNotFoundError(member_id)

    sessions = await (
        db.user_sessions.find({"user_id": member_id}, {"_id": 0}).sort("login_at", -1).limit(limit).to_list(limit)
    )

    return {
        "member_id": member_id,
        "username": member.get("username", "Anonymous"),
        "last_login_at": member.get("last_login_at"),
        "sessions": sessions,
    }


async def delete(member_id: str, *, acting_admin_id: str) -> dict:
    """Delete a member account and cascade-cleanup all their data.

    Raises:
        CannotDeleteSelfError if the admin targets their own account.
        MemberNotFoundError   if the member does not exist.

    Cascade cleanup checklist (collections impacted):
        - leagues             ($pull member_id from members[])
        - leaderboard         (delete_many user_id)
        - predictions         (delete_many user_id)
        - user_stats          (delete_one  user_id)
        - user_sessions       (delete_many user_id)
        - minigame_scores     (delete_many user_id)
        - chat_read_status    (delete_many user_id)
        - notification_reads  (delete_many user_id)
        - feedback            (delete_many user_id)
        - users               (delete_one  id)        -- last
    """
    if member_id == acting_admin_id:
        raise CannotDeleteSelfError("Cannot delete your own account")

    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise MemberNotFoundError(member_id)

    await db.leagues.update_many({"members": member_id}, {"$pull": {"members": member_id}})
    await db.leaderboard.delete_many({"user_id": member_id})
    await db.predictions.delete_many({"user_id": member_id})
    await db.user_stats.delete_one({"user_id": member_id})
    await db.user_sessions.delete_many({"user_id": member_id})
    await db.minigame_scores.delete_many({"user_id": member_id})
    await db.chat_read_status.delete_many({"user_id": member_id})
    await db.notification_reads.delete_many({"user_id": member_id})
    await db.feedback.delete_many({"user_id": member_id})
    await db.users.delete_one({"id": member_id})

    label = member.get("username") or member.get("email") or member_id
    logger.info("Admin deleted member %s (%s)", member_id, label)
    return {
        "status": "success",
        "message": f"Member {label} deleted successfully",
    }
