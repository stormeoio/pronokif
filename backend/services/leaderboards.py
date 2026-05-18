"""
PRONOKIF - Leaderboards service.

Business logic for the global and per-race leaderboards. Kept free of
FastAPI imports so it can be exercised directly from tests or admin
scripts.
"""

from __future__ import annotations

from config import db
from services.scoring import calculate_points


async def build_global(*, current_user_id: str, limit: int = 100) -> dict:
    """Aggregate every user's points across all leagues and rank them.

    Uses MongoDB aggregation pipeline instead of loading all users into
    memory. Returns the top ``limit`` rows, the caller's position, and
    the total roster size.
    """
    # Aggregate total points per user from the leaderboard collection,
    # then join with user data for username/avatar.
    pipeline = [
        {"$group": {"_id": "$user_id", "total_points": {"$sum": "$total_points"}}},
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "id",
                "as": "user",
            }
        },
        {"$unwind": "$user"},
        {"$match": {"user.username": {"$ne": None}}},
        {
            "$project": {
                "_id": 0,
                "user_id": "$_id",
                "username": {"$ifNull": ["$user.username", "Anonymous"]},
                "avatar_id": "$user.avatar_id",
                "total_points": 1,
                "level": {"$ifNull": ["$user.level", 1]},
                "xp": {"$ifNull": ["$user.xp", 0]},
            }
        },
        {"$sort": {"total_points": -1, "xp": -1}},
    ]

    all_ranked = await db.leaderboard.aggregate(pipeline).to_list(10000)

    # Also include users with a username but zero points (no leaderboard entry)
    ranked_user_ids = {e["user_id"] for e in all_ranked}
    zero_point_users = (
        await db.users.find(
            {"username": {"$ne": None}, "id": {"$nin": list(ranked_user_ids)}},
            {"_id": 0, "id": 1, "username": 1, "avatar_id": 1, "level": 1, "xp": 1},
        ).to_list(10000)
    )
    for u in zero_point_users:
        all_ranked.append(
            {
                "user_id": u["id"],
                "username": u.get("username", "Anonymous"),
                "avatar_id": u.get("avatar_id"),
                "total_points": 0,
                "level": u.get("level", 1),
                "xp": u.get("xp", 0),
            }
        )

    # Re-sort after adding zero-point users
    all_ranked.sort(key=lambda x: (-x["total_points"], -x["xp"]))

    top = []
    for i, entry in enumerate(all_ranked[:limit]):
        entry["position"] = i + 1
        top.append(entry)

    my_position = next(
        (i + 1 for i, e in enumerate(all_ranked) if e["user_id"] == current_user_id),
        None,
    )

    return {
        "leaderboard": top,
        "my_position": my_position,
        "total_players": len(all_ranked),
    }


async def build_race_weekend(*, race_id: str, league_id: str | None = None) -> dict:
    """Rank predictors for a single race. If ``league_id`` is provided, only
    members of that league are included. Returns an empty leaderboard with
    a friendly message when results haven't been imported yet.
    """
    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(5000)

    results = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not results:
        return {"message": "Results not available yet", "leaderboard": []}

    # Pre-fetch league members to avoid N+1 queries
    league_member_ids: set[str] | None = None
    if league_id:
        league_doc = await db.leagues.find_one({"id": league_id}, {"_id": 0, "members": 1})
        league_member_ids = set(league_doc.get("members", [])) if league_doc else set()

    # Batch-load user data for all prediction owners
    pred_user_ids = list({p["user_id"] for p in predictions})
    user_docs = await db.users.find(
        {"id": {"$in": pred_user_ids}},
        {"_id": 0, "id": 1, "username": 1, "avatar_id": 1},
    ).to_list(len(pred_user_ids))
    user_map = {u["id"]: u for u in user_docs}

    user_race_points: list[dict] = []
    for pred in predictions:
        uid = pred["user_id"]
        user_data = user_map.get(uid)
        if not user_data:
            continue

        if league_member_ids is not None and uid not in league_member_ids:
            continue

        points = calculate_points(pred, results["results"])
        user_race_points.append(
            {
                "user_id": uid,
                "username": user_data.get("username", "Anonymous"),
                "avatar_id": user_data.get("avatar_id"),
                "race_points": points["total"],
            }
        )

    user_race_points.sort(key=lambda x: x["race_points"], reverse=True)

    for i, entry in enumerate(user_race_points):
        entry["position"] = i + 1

    return {"leaderboard": user_race_points, "race_id": race_id}
