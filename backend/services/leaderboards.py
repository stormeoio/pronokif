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

    Returns the top ``limit`` rows (raw dicts — the route layer wraps them
    in the Pydantic response model), the caller's position even if they
    fall outside the top, and the total roster size.
    """
    users = await db.users.find({}, {"_id": 0}).to_list(10000)

    user_points: list[dict] = []
    for u in users:
        if not u.get("username"):
            continue

        leaderboard_entries = await db.leaderboard.find({"user_id": u["id"]}, {"_id": 0}).to_list(100)
        total_points = sum(e.get("total_points", 0) for e in leaderboard_entries)

        user_points.append(
            {
                "user_id": u["id"],
                "username": u.get("username", "Anonymous"),
                "avatar_id": u.get("avatar_id"),
                "total_points": total_points,
                "level": u.get("level", 1),
                "xp": u.get("xp", 0),
            }
        )

    # Highest points first, XP breaks ties.
    user_points.sort(key=lambda x: (-x["total_points"], -x["xp"]))

    top = []
    for i, entry in enumerate(user_points[:limit]):
        entry["position"] = i + 1
        top.append(entry)

    my_position = next(
        (i + 1 for i, e in enumerate(user_points) if e["user_id"] == current_user_id),
        None,
    )

    return {
        "leaderboard": top,
        "my_position": my_position,
        "total_players": len(user_points),
    }


async def build_race_weekend(*, race_id: str, league_id: str | None = None) -> dict:
    """Rank predictors for a single race. If ``league_id`` is provided, only
    members of that league are included. Returns an empty leaderboard with
    a friendly message when results haven't been imported yet.
    """
    predictions = await db.predictions.find({"race_id": race_id}, {"_id": 0}).to_list(10000)

    results = await db.race_results.find_one({"race_id": race_id}, {"_id": 0})
    if not results:
        return {"message": "Results not available yet", "leaderboard": []}

    user_race_points: list[dict] = []
    for pred in predictions:
        points = calculate_points(pred, results["results"])

        user_data = await db.users.find_one({"id": pred["user_id"]}, {"_id": 0})
        if not user_data:
            continue

        if league_id:
            user_leagues = await db.leagues.find({"id": league_id, "members": pred["user_id"]}, {"_id": 0}).to_list(1)
            if not user_leagues:
                continue

        user_race_points.append(
            {
                "user_id": pred["user_id"],
                "username": user_data.get("username", "Anonymous"),
                "avatar_id": user_data.get("avatar_id"),
                "race_points": points["total"],
            }
        )

    user_race_points.sort(key=lambda x: x["race_points"], reverse=True)

    for i, entry in enumerate(user_race_points):
        entry["position"] = i + 1

    return {"leaderboard": user_race_points, "race_id": race_id}
