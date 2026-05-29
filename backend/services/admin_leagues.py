from __future__ import annotations

from config import db


def league_search_query(search: str = "") -> dict:
    value = search.strip()
    if not value:
        return {}
    return {
        "$or": [
            {"name": {"$regex": value, "$options": "i"}},
            {"code": {"$regex": value, "$options": "i"}},
            {"description": {"$regex": value, "$options": "i"}},
        ]
    }


def dedupe_user_ids(user_ids: list[str] | None) -> list[str]:
    seen = set()
    clean_ids = []
    for user_id in user_ids or []:
        value = str(user_id or "").strip()
        if value and value not in seen:
            clean_ids.append(value)
            seen.add(value)
    return clean_ids


def league_admin_payload(
    league: dict,
    *,
    users_by_id: dict[str, dict] | None = None,
    leaderboard_entries: list[dict] | None = None,
    messages_count: int = 0,
) -> dict:
    users = users_by_id or {}
    members = dedupe_user_ids(league.get("members") or [])
    owner = users.get(league.get("created_by"), {})
    entries_by_user = {
        entry.get("user_id"): entry
        for entry in leaderboard_entries or []
        if entry.get("user_id")
    }

    member_details = []
    for user_id in members:
        user = users.get(user_id, {})
        entry = entries_by_user.get(user_id, {})
        member_details.append(
            {
                "user_id": user_id,
                "email": user.get("email"),
                "username": user.get("username"),
                "is_owner": user_id == league.get("created_by"),
                "total_points": entry.get("total_points", 0),
                "last_race_points": entry.get("last_race_points", 0),
                "leaderboard_position": None,
            }
        )

    member_details.sort(
        key=lambda member: (
            -int(member.get("total_points") or 0),
            str(member.get("username") or member.get("email") or member.get("user_id") or ""),
        )
    )
    for position, member in enumerate(member_details, start=1):
        member["leaderboard_position"] = position
    total_points = sum(int(member.get("total_points") or 0) for member in member_details)

    return {
        **league,
        "members": members,
        "members_count": len(members),
        "owner_email": owner.get("email"),
        "owner_username": owner.get("username"),
        "messages_count": messages_count,
        "leaderboard_entries_count": len(leaderboard_entries or []),
        "total_points": total_points,
        "average_points": round(total_points / len(member_details), 1) if member_details else 0,
        "member_details": member_details,
        "top_members": member_details[:5],
    }


def league_analytics_from_payloads(leagues: list[dict]) -> dict:
    total_memberships = sum(int(league.get("members_count") or 0) for league in leagues)
    total_messages = sum(int(league.get("messages_count") or 0) for league in leagues)
    total_points = sum(int(league.get("total_points") or 0) for league in leagues)
    review_queue: dict[str, int] = {}

    for league in leagues:
        status = league.get("review_status") or "none"
        review_queue[status] = review_queue.get(status, 0) + 1

    top_by_members = sorted(
        leagues,
        key=lambda league: (-int(league.get("members_count") or 0), str(league.get("name") or "")),
    )[:10]
    top_by_points = sorted(
        leagues,
        key=lambda league: (-int(league.get("total_points") or 0), str(league.get("name") or "")),
    )[:10]

    return {
        "summary": {
            "leagues_count": len(leagues),
            "active_leagues": len([league for league in leagues if not league.get("is_archived")]),
            "archived_leagues": len([league for league in leagues if league.get("is_archived")]),
            "empty_leagues": len([league for league in leagues if int(league.get("members_count") or 0) == 0]),
            "total_memberships": total_memberships,
            "average_members": round(total_memberships / len(leagues), 1) if leagues else 0,
            "total_messages": total_messages,
            "total_points": total_points,
            "average_points": round(total_points / len(leagues), 1) if leagues else 0,
        },
        "top_by_members": top_by_members,
        "top_by_points": top_by_points,
        "review_queue": review_queue,
    }


async def enrich_league_docs(leagues: list[dict]) -> list[dict]:
    if not leagues:
        return []

    league_ids = [league["id"] for league in leagues if league.get("id")]
    user_ids = {
        user_id
        for league in leagues
        for user_id in [league.get("created_by"), *(league.get("members") or [])]
        if user_id
    }

    users_by_id = {}
    if user_ids:
        users = await db.users.find(
            {"id": {"$in": list(user_ids)}},
            {"_id": 0, "id": 1, "email": 1, "username": 1, "level": 1, "xp": 1},
        ).to_list(len(user_ids))
        users_by_id = {user["id"]: user for user in users}

    leaderboard_by_league: dict[str, list[dict]] = {league_id: [] for league_id in league_ids}
    if league_ids:
        entries = await db.leaderboard.find(
            {"league_id": {"$in": league_ids}},
            {
                "_id": 0,
                "league_id": 1,
                "user_id": 1,
                "total_points": 1,
                "last_race_points": 1,
                "previous_position": 1,
            },
        ).to_list(10000)
        for entry in entries:
            league_id = entry.get("league_id")
            if league_id:
                leaderboard_by_league.setdefault(league_id, []).append(entry)

    messages_count_by_league = {league_id: 0 for league_id in league_ids}
    if league_ids:
        async for row in db.league_messages.aggregate(
            [
                {"$match": {"league_id": {"$in": league_ids}}},
                {"$group": {"_id": "$league_id", "count": {"$sum": 1}}},
            ]
        ):
            if row.get("_id"):
                messages_count_by_league[row["_id"]] = row.get("count", 0)

    return [
        league_admin_payload(
            league,
            users_by_id=users_by_id,
            leaderboard_entries=leaderboard_by_league.get(league.get("id"), []),
            messages_count=messages_count_by_league.get(league.get("id"), 0),
        )
        for league in leagues
    ]


async def reassign_current_league_for_user(user_id: str, deleted_league_id: str) -> None:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "current_league_id": 1})
    if not user or user.get("current_league_id") != deleted_league_id:
        return
    other_league = await db.leagues.find_one(
        {"members": user_id, "id": {"$ne": deleted_league_id}},
        {"_id": 0, "id": 1},
    )
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"current_league_id": other_league["id"] if other_league else None}},
    )
