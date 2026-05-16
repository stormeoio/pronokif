"""
PRONOKIF - League Routes
/leagues/* endpoints for league management, chat, and members
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from config import db
from models.schemas import (
    ChatMessage,
    LeaderboardEntry,
    LeagueCreate,
    LeagueJoin,
    LeagueResponse,
    LeagueUpdate,
    TransferOwnershipRequest,
)
from services.auth import generate_league_code, get_current_user

router = APIRouter(prefix="/leagues", tags=["Leagues"])


# ==================== LEAGUE CRUD ====================


@router.post("", response_model=LeagueResponse)
async def create_league(data: LeagueCreate, user: dict = Depends(get_current_user)):
    """Create a new league"""
    league_id = str(uuid.uuid4())
    code = generate_league_code()
    while await db.leagues.find_one({"code": code}):
        code = generate_league_code()

    league = {
        "id": league_id,
        "name": data.name,
        "code": code,
        "created_by": user["id"],
        "members": [user["id"]],
        "created_at": datetime.now(UTC).isoformat(),
        "description": data.description,
    }
    await db.leagues.insert_one(league)
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    await db.leaderboard.insert_one(
        {
            "id": str(uuid.uuid4()),
            "league_id": league_id,
            "user_id": user["id"],
            "total_points": 0,
            "last_race_points": 0,
            "previous_position": 1,
        }
    )
    return LeagueResponse(**{k: v for k, v in league.items() if k != "_id"})


@router.post("/join", response_model=LeagueResponse)
async def join_league(data: LeagueJoin, user: dict = Depends(get_current_user)):
    """Join a league with invitation code"""
    league = await db.leagues.find_one({"code": data.code.upper()}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if user["id"] in league["members"]:
        raise HTTPException(status_code=400, detail="Already a member")

    await db.leagues.update_one({"id": league["id"]}, {"$push": {"members": user["id"]}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league["id"]}})
    await db.leaderboard.insert_one(
        {
            "id": str(uuid.uuid4()),
            "league_id": league["id"],
            "user_id": user["id"],
            "total_points": 0,
            "last_race_points": 0,
            "previous_position": len(league["members"]) + 1,
        }
    )
    league["members"].append(user["id"])
    return LeagueResponse(**league)


@router.get("/my", response_model=list[LeagueResponse])
async def get_my_leagues(user: dict = Depends(get_current_user)):
    """Get all leagues the user is a member of"""
    leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    return [LeagueResponse(**league) for league in leagues]


@router.get("/unread-messages")
async def get_unread_messages_count(user: dict = Depends(get_current_user)) -> dict:
    """Get count of unread messages for all user's leagues"""
    leagues = await db.leagues.find({"members": user["id"]}, {"_id": 0}).to_list(100)

    unread_counts = {}
    total_unread = 0

    for league in leagues:
        read_status = await db.chat_read_status.find_one({"user_id": user["id"], "league_id": league["id"]}, {"_id": 0})
        last_read = read_status.get("last_read_at") if read_status else None

        query = {"league_id": league["id"]}
        if last_read:
            query["created_at"] = {"$gt": last_read}
        query["user_id"] = {"$ne": user["id"]}

        count = await db.league_messages.count_documents(query)
        if count > 0:
            unread_counts[league["id"]] = count
            total_unread += count

    return {"total_unread": total_unread, "by_league": unread_counts}


@router.get("/by-code/{code}")
async def get_league_by_code(code: str) -> dict:
    """Get league info by invitation code (public endpoint for join links)"""
    league = await db.leagues.find_one({"code": code.upper()}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    return {
        "id": league["id"],
        "name": league["name"],
        "code": league["code"],
        "members_count": len(league["members"]),
        "description": league.get("description"),
    }


@router.get("/{league_id}", response_model=LeagueResponse)
async def get_league(league_id: str, user: dict = Depends(get_current_user)):
    """Get league details"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    if user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member")
    return LeagueResponse(**league)


@router.get("/{league_id}/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(league_id: str, user: dict = Depends(get_current_user)):
    """Get league leaderboard"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    entries = await db.leaderboard.find({"league_id": league_id}, {"_id": 0}).to_list(100)
    entries.sort(key=lambda x: x["total_points"], reverse=True)

    result = []
    for i, entry in enumerate(entries):
        user_data = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0})
        position = i + 1
        position_change = entry.get("previous_position", position) - position
        username = user_data.get("username") if user_data else None
        if not username:
            username = "Anonymous"
        result.append(
            LeaderboardEntry(
                user_id=entry["user_id"],
                username=username,
                total_points=entry["total_points"],
                last_race_points=entry.get("last_race_points", 0),
                position=position,
                position_change=position_change,
            )
        )
    return result


@router.post("/{league_id}/select")
async def select_league(league_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Select a league as current"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=404, detail="League not found or not a member")
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": league_id}})
    return {"message": "League selected", "league_id": league_id}


@router.put("/{league_id}", response_model=LeagueResponse)
async def update_league(league_id: str, data: LeagueUpdate, user: dict = Depends(get_current_user)):
    """Update league name and/or description (owner only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the league owner can update the league")

    update_data = {}
    if data.name is not None and data.name.strip():
        update_data["name"] = data.name.strip()
    if data.description is not None:
        update_data["description"] = data.description.strip() if data.description.strip() else None

    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    await db.leagues.update_one({"id": league_id}, {"$set": update_data})
    updated_league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    return LeagueResponse(**updated_league)


@router.post("/{league_id}/leave")
async def leave_league(league_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Leave a league"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    if user["id"] not in league["members"]:
        raise HTTPException(status_code=400, detail="You are not a member of this league")

    if league["created_by"] == user["id"]:
        if len(league["members"]) > 1:
            raise HTTPException(
                status_code=400,
                detail="En tant que créateur, tu dois d'abord transférer la propriété ou supprimer la ligue",
            )
        else:
            await db.leagues.delete_one({"id": league_id})
            await db.league_messages.delete_many({"league_id": league_id})
            await db.leaderboard.delete_many({"league_id": league_id})
            await db.chat_read_status.delete_many({"league_id": league_id})

            if user.get("current_league_id") == league_id:
                await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": None}})

            return {"status": "success", "message": "La ligue a été supprimée car tu étais le seul membre"}

    await db.leagues.update_one({"id": league_id}, {"$pull": {"members": user["id"]}})
    await db.leaderboard.delete_one({"league_id": league_id, "user_id": user["id"]})
    await db.chat_read_status.delete_one({"league_id": league_id, "user_id": user["id"]})

    if user.get("current_league_id") == league_id:
        other_league = await db.leagues.find_one({"members": user["id"]}, {"_id": 0})
        new_league_id = other_league["id"] if other_league else None
        await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": new_league_id}})

    return {"status": "success", "message": "Tu as quitté la ligue"}


@router.delete("/{league_id}")
async def delete_league(league_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Delete a league (creator only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Seul le créateur peut supprimer la ligue")

    for member_id in league["members"]:
        member = await db.users.find_one({"id": member_id}, {"_id": 0})
        if member and member.get("current_league_id") == league_id:
            other_league = await db.leagues.find_one({"members": member_id, "id": {"$ne": league_id}}, {"_id": 0})
            new_league_id = other_league["id"] if other_league else None
            await db.users.update_one({"id": member_id}, {"$set": {"current_league_id": new_league_id}})

    await db.league_messages.delete_many({"league_id": league_id})
    await db.leaderboard.delete_many({"league_id": league_id})
    await db.chat_read_status.delete_many({"league_id": league_id})
    await db.leagues.delete_one({"id": league_id})

    return {"status": "success", "message": f"La ligue '{league['name']}' a été supprimée"}


@router.post("/{league_id}/transfer")
async def transfer_league_ownership(
    league_id: str, data: TransferOwnershipRequest, user: dict = Depends(get_current_user)
) -> dict:
    """Transfer league ownership to another member (creator only)"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    if league["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Seul le créateur peut transférer la propriété")

    if data.new_owner_id == user["id"]:
        raise HTTPException(status_code=400, detail="Tu es déjà le propriétaire")

    if data.new_owner_id not in league["members"]:
        raise HTTPException(status_code=400, detail="Le nouveau propriétaire doit être membre de la ligue")

    new_owner = await db.users.find_one({"id": data.new_owner_id}, {"_id": 0})
    if not new_owner:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    await db.leagues.update_one({"id": league_id}, {"$set": {"created_by": data.new_owner_id}})

    new_owner_name = new_owner.get("username") or new_owner.get("email", "").split("@")[0]
    return {
        "status": "success",
        "message": f"La propriété a été transférée à {new_owner_name}",
        "new_owner_id": data.new_owner_id,
    }


# ==================== LEAGUE CHAT ====================


@router.post("/{league_id}/messages")
async def send_league_message(league_id: str, data: ChatMessage, user: dict = Depends(get_current_user)) -> dict:
    """Send a message to the league chat"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(data.content) > 500:
        raise HTTPException(status_code=400, detail="Message too long (max 500 characters)")

    message = {
        "id": str(uuid.uuid4()),
        "league_id": league_id,
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "avatar_id": user.get("avatar_id"),
        "custom_avatar_url": user.get("custom_avatar_url"),
        "content": data.content.strip(),
        "created_at": datetime.now(UTC).isoformat(),
    }

    await db.league_messages.insert_one(message)
    return {k: v for k, v in message.items() if k != "_id"}


@router.get("/{league_id}/messages")
async def get_league_messages(
    league_id: str, limit: int = 50, before: str = None, user: dict = Depends(get_current_user)
) -> list[dict]:
    """Get messages from the league chat"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    query = {"league_id": league_id}
    if before:
        query["created_at"] = {"$lt": before}

    messages = await db.league_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return list(reversed(messages))


@router.get("/{league_id}/members")
async def get_league_members(league_id: str, user: dict = Depends(get_current_user)) -> list[dict]:
    """Get all members of a league with their basic info"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    members = []
    for member_id in league["members"]:
        member = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
        if member:
            members.append(
                {
                    "id": member["id"],
                    "username": member.get("username", "Anonymous"),
                    "avatar_id": member.get("avatar_id"),
                    "custom_avatar_url": member.get("custom_avatar_url"),
                    "level": member.get("level", 1),
                    "xp": member.get("xp", 0),
                    "is_owner": member["id"] == league["created_by"],
                }
            )

    return members


@router.post("/{league_id}/messages/read")
async def mark_league_messages_read(league_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Mark all messages in a league as read for the current user"""
    league = await db.leagues.find_one({"id": league_id}, {"_id": 0})
    if not league or user["id"] not in league["members"]:
        raise HTTPException(status_code=403, detail="Not a member of this league")

    await db.chat_read_status.update_one(
        {"user_id": user["id"], "league_id": league_id},
        {"$set": {"last_read_at": datetime.now(UTC).isoformat()}},
        upsert=True,
    )
    return {"success": True}
