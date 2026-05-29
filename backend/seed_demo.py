"""
Seed Pronokif with a coherent demo dataset.

The goal is to make every app surface useful in local/prod staging:
calendar, races, results, predictions, leagues, chat, notifications,
custom predictions, minigames, feedback, media and admin counters.

Run:
    PYTHONPATH=. python seed_demo.py

Optional:
    DEMO_SEED_HOST_EMAILS=fred@stormeo.io,other@domain.tld PYTHONPATH=. python seed_demo.py
"""

from __future__ import annotations

import asyncio
import base64
import os
import random
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from passlib.context import CryptContext

from config import db, logger
from data.avatars import DEFAULT_AVATARS, DRIVER_AVATARS, TEAM_AVATARS
from data.f1_data import F1_CIRCUITS, F1_DRIVERS_2026
from features import get_default_user_stats, get_level_from_xp
from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    F1_2026_CHAMPIONSHIP_SLUG,
    F1_2026_SEASON,
    f1_2026_championship_from_races,
    race_championship_link,
)
from services.knowledge_seed import seed_f1_2026_knowledge
from services.race_calendar import (
    CANCELLED_2026_RACE_IDS,
    active_2026_races,
    predictions_close_at_utc,
    race_start_at_utc,
    race_temporal_status,
    syncable_2026_races,
)
from services.scoring import calculate_points

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PASSWORD = "demo1234"
DEMO_EMAIL_DOMAIN = "demo.pronokif.com"
DEMO_SOURCE = "demo_seed_v2"
REFERENCE_DATE = datetime(2026, 5, 26, 12, 0, tzinfo=UTC)
DEFAULT_HOST_EMAILS = ("fred@stormeo.io",)
SPRINT_RACES = {"china-2026", "miami-2026", "austin-2026", "brazil-2026", "qatar-2026"}

DRIVER_IDS = [driver["id"] for driver in F1_DRIVERS_2026]
DRIVER_BY_ID = {driver["id"]: driver for driver in F1_DRIVERS_2026}
AVATAR_IDS = [avatar["id"] for avatar in DRIVER_AVATARS + TEAM_AVATARS + DEFAULT_AVATARS]

DEMO_PLAYERS = [
    ("patou", "Patou"),
    ("maxou", "Maxou"),
    ("loulou", "Loulou"),
    ("enzo", "Enzo"),
    ("mika", "Mika"),
    ("raph", "Raph"),
    ("nina", "Nina"),
    ("sam", "Sam"),
    ("jules", "Jules"),
    ("alex", "Alex"),
    ("cam", "Cam"),
    ("zoe", "Zoe"),
]

DEMO_LEAGUES = [
    {
        "id": "demo-league-paddock-elite",
        "name": "Paddock Elite",
        "code": "PADK26",
        "description": "Main demo championship for tracking picks, chat, and reminders.",
        "member_keys": ["host", "patou", "maxou", "loulou", "enzo", "mika", "nina", "jules"],
    },
    {
        "id": "demo-league-scuderia-night",
        "name": "Scuderia Night",
        "code": "SCUD26",
        "description": "A more compact league with mini-games and custom picks.",
        "member_keys": ["host", "raph", "sam", "alex", "cam", "zoe", "patou"],
    },
    {
        "id": "demo-league-turbo-family",
        "name": "Turbo Family",
        "code": "TURB26",
        "description": "Family demo league with a few late users to test reminders.",
        "member_keys": ["host", "loulou", "mika", "raph", "nina", "enzo"],
    },
]


def _iso(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat()


def _stable_id(namespace: str, value: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"pronokif:{namespace}:{value}"))


def _host_emails() -> list[str]:
    raw = os.environ.get("DEMO_SEED_HOST_EMAILS", ",".join(DEFAULT_HOST_EMAILS))
    return [email.strip().lower() for email in raw.split(",") if email.strip()]


def _rotate_driver_ids(offset: int, *, count: int = 10) -> list[str]:
    offset = offset % len(DRIVER_IDS)
    return (DRIVER_IDS[offset:] + DRIVER_IDS[:offset])[:count]


def _bonus_for(top10: list[str], offset: int) -> dict[str, Any]:
    return {
        "safety_car": offset % 2 == 0,
        "dnf_drivers": [top10[-1], DRIVER_IDS[(offset + 13) % len(DRIVER_IDS)]],
        "fastest_lap_driver": top10[(offset + 3) % len(top10)],
        "first_corner_leader": top10[0],
    }


def _race_datetime(race: dict, date_key: str = "date", time_key: str = "race_time") -> datetime:
    if date_key == "date" and time_key == "race_time":
        race_start = race_start_at_utc(race)
        if race_start:
            return race_start
    date = race[date_key]
    time_value = race.get(time_key, "15:00")
    return datetime.fromisoformat(f"{date}T{time_value}:00+00:00")


def _race_media_path(race_id: str) -> str:
    return f"/images/races/{race_id}.webp"


def _race_doc(race: dict, index: int) -> dict[str, Any]:
    race_time = race.get("race_time", "15:00")
    quali_time = race.get("quali_time", "14:00")
    race_date = _race_datetime(race)
    predictions_close = predictions_close_at_utc(race) or race_date
    is_cancelled = race["id"] in CANCELLED_2026_RACE_IDS or race.get("is_cancelled", False)
    circuit = F1_CIRCUITS.get(race.get("circuit", ""), {})

    status = race_temporal_status({**race, "is_cancelled": is_cancelled}, now=REFERENCE_DATE)

    doc = {
        "id": race["id"],
        "season": F1_2026_SEASON,
        **race_championship_link({"season": F1_2026_SEASON, **race}, championship_id=F1_2026_CHAMPIONSHIP_ID),
        "round_number": race.get("round_number", index),
        "name": race["name"],
        "circuit": race["circuit"],
        "country": race["country"],
        "date": race["date"],
        "quali_date": race["quali_date"],
        "race_time": race_time,
        "quali_time": quali_time,
        "timezone": race.get("timezone", "Europe/Paris"),
        "race_duration_minutes": race.get("race_duration_minutes", 120),
        "race_start_at": _iso(race_date),
        "race_end_at": _iso(race_date + timedelta(minutes=race.get("race_duration_minutes", 120))),
        "is_sprint": race.get("is_sprint", False),
        "is_sprint_weekend": race.get("is_sprint", False),
        "is_cancelled": is_cancelled,
        "is_test_race": False,
        "status": status,
        "predictions_close_at": _iso(predictions_close),
        "thumbnail_url": _race_media_path(race["id"]),
        "image_url": _race_media_path(race["id"]),
        "circuit_length_km": circuit.get("length_km"),
        "laps": circuit.get("laps"),
        "turns": circuit.get("turns"),
        "demo_seeded": True,
        "seed_source": DEMO_SOURCE,
        "updated_at": _iso(REFERENCE_DATE),
    }
    for key in ("fp1_date", "fp1_time", "fp2_date", "fp2_time", "fp3_date", "fp3_time"):
        if race.get(key):
            doc[key] = race[key]
    if race.get("is_sprint"):
        doc.update(
            {
                "sprint_quali_date": race.get("sprint_quali_date"),
                "sprint_quali_time": race.get("sprint_quali_time"),
                "sprint_race_date": race.get("sprint_race_date"),
                "sprint_race_time": race.get("sprint_race_time"),
            }
        )
    return doc


async def _cleanup_demo_data() -> None:
    old_demo_users = await db.users.find(
        {"$or": [{"email": {"$regex": f"@{DEMO_EMAIL_DOMAIN}$"}}, {"demo_seeded": True}]},
        {"_id": 0, "id": 1},
    ).to_list(200)
    old_demo_user_ids = [user["id"] for user in old_demo_users]

    old_demo_leagues = await db.leagues.find({"demo_seeded": True}, {"_id": 0, "id": 1}).to_list(200)
    old_demo_league_ids = [league["id"] for league in old_demo_leagues]

    if old_demo_user_ids:
        await db.users.delete_many({"id": {"$in": old_demo_user_ids}})
        await db.user_stats.delete_many({"user_id": {"$in": old_demo_user_ids}})

    demo_marked_collections = [
        "predictions",
        "race_results",
        "leaderboard",
        "championships",
        "league_messages",
        "chat_read_status",
        "custom_predictions",
        "custom_prediction_answers",
        "minigame_results",
        "minigame_scores",
        "notifications",
        "feedback",
        "media",
        "invitations",
    ]
    for name in demo_marked_collections:
        await getattr(db, name).delete_many({"demo_seeded": True})

    if old_demo_league_ids:
        league_filter = {"league_id": {"$in": old_demo_league_ids}}
        for name in (
            "leaderboard",
            "league_messages",
            "chat_read_status",
            "custom_predictions",
            "minigame_results",
            "minigame_scores",
        ):
            await getattr(db, name).delete_many(league_filter)

    await db.leagues.delete_many({"demo_seeded": True})
    await db.race_results.delete_many(
        {"race_id": {"$in": list(CANCELLED_2026_RACE_IDS)}, "demo_seeded": True}
    )
    await db.races.delete_one({"id": "emilia-2026", "demo_seeded": True})


async def _seed_championships() -> None:
    races = active_2026_races()
    f1_2026 = {
        **f1_2026_championship_from_races(races),
        "slug": F1_2026_CHAMPIONSHIP_SLUG,
        "name": "PronoKif F1 2026",
        "name_translations": {
            "fr": "PronoKif F1 2026",
            "en": "PronoKif F1 2026",
        },
        "description": "Championnat principal demo base sur le calendrier F1 2026.",
        "description_translations": {
            "fr": "Championnat principal demo base sur le calendrier F1 2026.",
            "en": "Main demo championship based on the 2026 F1 calendar.",
        },
        "thumbnail_url": "/images/races/australia-2026.webp",
    }
    championships = [
        f1_2026,
        {
            "id": "championship-sprint-2026",
            "slug": "sprint-masters-2026",
            "series": "formula_1_sprint",
            "name": "Sprint Masters 2026",
            "season": 2026,
            "description": "Demo challenge for sprint weekends and mini-games.",
            "thumbnail_url": "/images/races/austin-2026.webp",
            "is_active": True,
        },
    ]
    for championship in championships:
        await db.championships.update_one(
            {"id": championship["id"]},
            {
                "$set": {
                    **championship,
                    "created_at": _iso(REFERENCE_DATE - timedelta(days=45)),
                    "created_by": "demo-seed",
                    "updated_at": _iso(REFERENCE_DATE),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            },
            upsert=True,
        )


async def _seed_calendar() -> list[dict]:
    races = active_2026_races()
    for index, race in enumerate(races, start=1):
        await db.races.update_one({"id": race["id"]}, {"$set": _race_doc(race, index)}, upsert=True)
    return races


async def _load_host_users() -> list[dict]:
    emails = _host_emails()
    host_users = await db.users.find({"email": {"$in": emails}}, {"_id": 0}).to_list(20)
    if host_users:
        return host_users

    fallback_email = emails[0] if emails else "fred@stormeo.io"
    user = {
        "id": _stable_id("host-user", fallback_email),
        "email": fallback_email,
        "username": "Fred",
        "password_hash": pwd_context.hash(DEMO_PASSWORD),
        "created_at": _iso(REFERENCE_DATE - timedelta(days=60)),
        "email_verified": True,
        "xp": 0,
        "level": 1,
        "avatar_id": "driver_16",
        "current_league_id": None,
        "demo_seeded_host": True,
    }
    await db.users.insert_one(user)
    return [{k: v for k, v in user.items() if k != "_id"}]


async def _seed_demo_users() -> tuple[list[dict], dict[str, dict]]:
    password_hash = pwd_context.hash(DEMO_PASSWORD)
    demo_users = []
    by_key: dict[str, dict] = {}

    for index, (key, username) in enumerate(DEMO_PLAYERS, start=1):
        email = f"{key}@{DEMO_EMAIL_DOMAIN}"
        xp = 140 + index * 85
        user = {
            "id": _stable_id("demo-user", email),
            "email": email,
            "username": username,
            "password_hash": password_hash,
            "created_at": _iso(REFERENCE_DATE - timedelta(days=50 - index)),
            "email_verified": True,
            "xp": xp,
            "level": get_level_from_xp(xp),
            "avatar_id": AVATAR_IDS[(index - 1) % len(AVATAR_IDS)],
            "custom_avatar_url": None,
            "current_league_id": None,
            "demo_seeded": True,
            "seed_source": DEMO_SOURCE,
        }
        await db.users.insert_one(user)
        clean_user = {k: v for k, v in user.items() if k != "_id"}
        demo_users.append(clean_user)
        by_key[key] = clean_user

    return demo_users, by_key


async def _seed_leagues(host_users: list[dict], demo_users_by_key: dict[str, dict]) -> list[dict]:
    host = host_users[0]
    leagues = []

    for league_index, league_seed in enumerate(DEMO_LEAGUES):
        members = []
        for member_key in league_seed["member_keys"]:
            user = host if member_key == "host" else demo_users_by_key[member_key]
            if user["id"] not in members:
                members.append(user["id"])

        league = {
            "id": league_seed["id"],
            "name": league_seed["name"],
            "code": league_seed["code"],
            "description": league_seed["description"],
            "created_by": host["id"] if league_index == 0 else members[1],
            "members": members,
            "created_at": _iso(REFERENCE_DATE - timedelta(days=40 - league_index * 4)),
            "demo_seeded": True,
            "seed_source": DEMO_SOURCE,
        }
        await db.leagues.insert_one(league)
        leagues.append(league)

    for user in host_users:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"current_league_id": leagues[0]["id"], "email_verified": True}},
        )

    for user in demo_users_by_key.values():
        current = next((league["id"] for league in leagues if user["id"] in league["members"]), None)
        await db.users.update_one({"id": user["id"]}, {"$set": {"current_league_id": current}})

    return leagues


def _official_result_for(race: dict, race_index: int) -> dict[str, Any]:
    base = _rotate_driver_ids(race_index * 2)
    sprint_base = _rotate_driver_ids(race_index * 2 + 3)
    results = {
        "quali_pole": base[0],
        "quali_top10": base,
        "race_winner": base[1],
        "race_top10": [base[1], base[0], *base[2:10]],
        "bonus": _bonus_for(base, race_index),
    }
    if race.get("is_sprint"):
        results.update(
            {
                "sprint_quali_top10": sprint_base,
                "sprint_race_winner": sprint_base[1],
                "sprint_race_top10": [sprint_base[1], sprint_base[0], *sprint_base[2:10]],
                "sprint_bonus": _bonus_for(sprint_base, race_index + 4),
            }
        )
    return results


async def _seed_results(races: list[dict]) -> dict[str, dict]:
    result_races = [
        race
        for race in syncable_2026_races()
        if _race_datetime(race) <= REFERENCE_DATE and race["id"] not in CANCELLED_2026_RACE_IDS
    ]
    valid_result_race_ids = [race["id"] for race in result_races]
    await db.race_results.delete_many(
        {"demo_seeded": True, "race_id": {"$nin": valid_result_race_ids}}
    )
    results_by_race = {}

    for race_index, race in enumerate(result_races, start=1):
        results = _official_result_for(race, race_index)
        doc = {
            "id": _stable_id("race-result", race["id"]),
            "race_id": race["id"],
            "race_name": race["name"],
            "season": F1_2026_SEASON,
            "championship_id": F1_2026_CHAMPIONSHIP_ID,
            "results": results,
            "source": "demo",
            "status": "complete",
            "demo_seeded": True,
            "seed_source": DEMO_SOURCE,
            "created_at": _iso(_race_datetime(race) + timedelta(hours=3)),
            "entered_at": _iso(_race_datetime(race) + timedelta(hours=3)),
            "updated_at": _iso(REFERENCE_DATE),
        }
        await db.race_results.update_one({"race_id": race["id"]}, {"$set": doc}, upsert=True)
        await db.races.update_one({"id": race["id"]}, {"$set": {"status": "finished", "has_results": True}})
        results_by_race[race["id"]] = doc

    for race_id in CANCELLED_2026_RACE_IDS:
        await db.races.update_one({"id": race_id}, {"$set": {"status": "cancelled", "has_results": False}})

    return results_by_race


def _prediction_for(user_offset: int, race: dict, race_index: int, *, locked: bool) -> dict[str, Any]:
    top10 = _rotate_driver_ids(user_offset + race_index)
    race_top10 = [top10[1], top10[0], *top10[2:10]]
    prediction = {
        "quali_pole": top10[0],
        "quali_top10": top10,
        "race_winner": race_top10[0],
        "race_top10": race_top10,
        "bonus_bets": _bonus_for(top10, user_offset + race_index),
        "custom_predictions": {},
        "locked": locked,
    }
    if race.get("is_sprint"):
        sprint_top10 = _rotate_driver_ids(user_offset + race_index + 4)
        prediction.update(
            {
                "sprint_quali_pole": sprint_top10[0],
                "sprint_quali_top10": sprint_top10,
                "sprint_race_winner": sprint_top10[1],
                "sprint_race_top10": [sprint_top10[1], sprint_top10[0], *sprint_top10[2:10]],
                "sprint_bonus_bets": _bonus_for(sprint_top10, user_offset + race_index + 7),
            }
        )
    return prediction


async def _seed_predictions(
    *,
    races: list[dict],
    result_docs: dict[str, dict],
    users: list[dict],
    host_users: list[dict],
) -> tuple[dict[str, int], dict[str, int], str]:
    points_by_user: dict[str, int] = defaultdict(int)
    last_race_points_by_user: dict[str, int] = defaultdict(int)
    race_map = {race["id"]: race for race in races}
    past_races = [race_map[race_id] for race_id in result_docs]
    future_races = [
        race
        for race in races
        if race["id"] not in result_docs
        and race["id"] not in CANCELLED_2026_RACE_IDS
        and _race_datetime(race) > REFERENCE_DATE
    ][:4]
    prediction_races = past_races + future_races
    last_result_race_id = past_races[-1]["id"] if past_races else ""

    host_ids = {user["id"] for user in host_users}

    for race_index, race in enumerate(prediction_races, start=1):
        is_result_race = race["id"] in result_docs
        for user_index, user in enumerate(users, start=1):
            # Keep some future-race gaps so the BO "missing predictions" view is useful.
            if not is_result_race and user["id"] not in host_ids and (user_index + race_index) % 3 == 0:
                continue

            payload = _prediction_for(user_index, race, race_index, locked=is_result_race)
            created_at = _race_datetime(race, "quali_date", "quali_time") - timedelta(days=1, hours=user_index % 4)
            doc = {
                "id": _stable_id("prediction", f"{user['id']}:{race['id']}"),
                "user_id": user["id"],
                "race_id": race["id"],
                "season": F1_2026_SEASON,
                "championship_id": F1_2026_CHAMPIONSHIP_ID,
                **payload,
                "created_at": _iso(created_at),
                "updated_at": _iso(created_at + timedelta(minutes=10)),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }

            if is_result_race:
                scoring = calculate_points(doc, result_docs[race["id"]]["results"])
                doc["points_total"] = scoring["total"]
                doc["points_breakdown"] = scoring
                doc["scored_at"] = _iso(_race_datetime(race) + timedelta(hours=4))
                points_by_user[user["id"]] += scoring["total"]
                if race["id"] == last_result_race_id:
                    last_race_points_by_user[user["id"]] = scoring["total"]

            await db.predictions.update_one(
                {"user_id": user["id"], "race_id": race["id"]},
                {"$set": doc},
                upsert=True,
            )

    return dict(points_by_user), dict(last_race_points_by_user), last_result_race_id


async def _seed_leaderboards(
    *,
    leagues: list[dict],
    users_by_id: dict[str, dict],
    points_by_user: dict[str, int],
    last_race_points_by_user: dict[str, int],
) -> None:
    for league in leagues:
        sorted_members = sorted(
            league["members"],
            key=lambda user_id: (-points_by_user.get(user_id, 0), users_by_id.get(user_id, {}).get("username", "")),
        )
        for position, user_id in enumerate(sorted_members, start=1):
            user = users_by_id.get(user_id)
            if not user:
                continue
            previous = max(1, position + (-1 if position % 2 == 0 else 1))
            entry = {
                "id": _stable_id("leaderboard", f"{league['id']}:{user_id}"),
                "league_id": league["id"],
                "user_id": user_id,
                "season": F1_2026_SEASON,
                "championship_id": F1_2026_CHAMPIONSHIP_ID,
                "username": user.get("username") or user.get("email"),
                "avatar_id": user.get("avatar_id"),
                "custom_avatar_url": user.get("custom_avatar_url"),
                "total_points": points_by_user.get(user_id, 0),
                "last_race_points": last_race_points_by_user.get(user_id, 0),
                "position": position,
                "previous_position": previous,
                "position_change": previous - position,
                "updated_at": _iso(REFERENCE_DATE),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
            await db.leaderboard.insert_one(entry)


async def _seed_chat(leagues: list[dict], users_by_id: dict[str, dict], host_users: list[dict]) -> None:
    host_id = host_users[0]["id"]
    templates = [
        "Monaco is approaching, lock your Top 10 before qualifying.",
        "Je garde Norris devant Leclerc ce week-end.",
        "La meteo peut tout changer, safety car probable.",
        "Who is betting on Hadjar in the points?",
        "Canada debrief: big leaderboard gap, now closing up.",
    ]

    for league_index, league in enumerate(leagues):
        for message_index, content in enumerate(templates[: 3 + league_index]):
            user_id = league["members"][message_index % len(league["members"])]
            user = users_by_id[user_id]
            created_at = REFERENCE_DATE - timedelta(hours=8 - message_index, minutes=league_index * 7)
            await db.league_messages.insert_one(
                {
                    "id": _stable_id("league-message", f"{league['id']}:{message_index}"),
                    "league_id": league["id"],
                    "user_id": user_id,
                    "username": user.get("username") or user.get("email"),
                    "avatar_id": user.get("avatar_id"),
                    "custom_avatar_url": user.get("custom_avatar_url"),
                    "content": content,
                    "created_at": _iso(created_at),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            )

        await db.chat_read_status.insert_one(
            {
                "id": _stable_id("chat-read", f"{league['id']}:{host_id}"),
                "league_id": league["id"],
                "user_id": host_id,
                "last_read_at": _iso(REFERENCE_DATE - timedelta(hours=6)),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        )


async def _seed_custom_predictions(leagues: list[dict], races: list[dict], users_by_id: dict[str, dict]) -> None:
    next_race = next(race for race in races if race["id"] == "monaco-2026")
    canada = next(race for race in races if race["id"] == "canada-2026")
    questions = [
        (next_race, "Which driver will gain the most positions?", "drivers", False),
        (next_race, "Y aura-t-il une safety car a Monaco ?", "custom", False),
        (canada, "Quel rookie a le plus surpris au Canada ?", "drivers", False),
    ]

    for league_index, league in enumerate(leagues):
        creator_id = league["created_by"]
        for question_index, (race, question, answer_type, multiple) in enumerate(questions[: 2 + (league_index == 0)]):
            choices = [
                {"id": "choice_0", "text": DRIVER_BY_ID["norris"]["name"], "driver_id": "norris", "points": 2},
                {"id": "choice_1", "text": DRIVER_BY_ID["leclerc"]["name"], "driver_id": "leclerc", "points": 2},
                {"id": "choice_2", "text": DRIVER_BY_ID["hadjar"]["name"], "driver_id": "hadjar", "points": 3},
                {"id": "choice_3", "text": "Oui", "points": 2},
                {"id": "choice_4", "text": "Non", "points": 2},
            ]
            custom_id = _stable_id("custom-prediction", f"{league['id']}:{race['id']}:{question_index}")
            correct_answer = "hadjar" if race["id"] == "canada-2026" else None
            await db.custom_predictions.insert_one(
                {
                    "id": custom_id,
                    "race_id": race["id"],
                    "season": F1_2026_SEASON,
                    "championship_id": F1_2026_CHAMPIONSHIP_ID,
                    "league_id": league["id"],
                    "created_by": creator_id,
                    "question": question,
                    "answer_type": answer_type,
                    "multiple_choice": multiple,
                    "choices": choices,
                    "correct_answer": correct_answer,
                    "created_at": _iso(REFERENCE_DATE - timedelta(days=2, hours=question_index)),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            )

            answerable_members = league["members"][: max(3, len(league["members"]) - 2)]
            for member_index, user_id in enumerate(answerable_members):
                answer = "hadjar" if answer_type == "drivers" and member_index % 2 else "leclerc"
                if answer_type == "custom":
                    answer = "Oui" if member_index % 2 == 0 else "Non"
                await db.custom_prediction_answers.insert_one(
                    {
                        "id": _stable_id("custom-answer", f"{custom_id}:{user_id}"),
                        "prediction_id": custom_id,
                        "user_id": user_id,
                        "answer": answer,
                        "answered_at": _iso(REFERENCE_DATE - timedelta(days=1, minutes=member_index * 11)),
                        "demo_seeded": True,
                        "seed_source": DEMO_SOURCE,
                    }
                )


async def _seed_minigames(leagues: list[dict], users_by_id: dict[str, dict]) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = defaultdict(dict)
    primary_league = leagues[0]
    race_id = "monaco-2026"

    for member_index, user_id in enumerate(primary_league["members"], start=1):
        reaction_score = 178 + member_index * 11
        batak_score = 24 + (len(primary_league["members"]) - member_index)
        for attempt in range(1, 4):
            await db.minigame_results.insert_one(
                {
                    "id": _stable_id("minigame-result", f"reaction:{user_id}:{attempt}"),
                    "user_id": user_id,
                    "game_type": "reaction",
                    "score": reaction_score + attempt * 6,
                    "league_id": primary_league["id"],
                    "race_id": race_id,
                    "season": F1_2026_SEASON,
                    "championship_id": F1_2026_CHAMPIONSHIP_ID,
                    "is_training": False,
                    "created_at": _iso(REFERENCE_DATE - timedelta(hours=attempt, minutes=member_index)),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            )
            await db.minigame_results.insert_one(
                {
                    "id": _stable_id("minigame-result", f"batak:{user_id}:{attempt}"),
                    "user_id": user_id,
                    "game_type": "batak",
                    "score": batak_score - attempt + 1,
                    "league_id": primary_league["id"],
                    "race_id": race_id,
                    "season": F1_2026_SEASON,
                    "championship_id": F1_2026_CHAMPIONSHIP_ID,
                    "is_training": False,
                    "created_at": _iso(REFERENCE_DATE - timedelta(hours=attempt + 1, minutes=member_index)),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            )

        stats[user_id]["best_reaction_time"] = reaction_score
        stats[user_id]["best_batak_score"] = batak_score
        stats[user_id]["reaction_games_played"] = 3
        stats[user_id]["batak_games_played"] = 3
        stats[user_id]["reaction_sub_200"] = int(reaction_score < 200)
        stats[user_id]["batak_30_targets"] = int(batak_score >= 30)

        for game_type, score in (("reaction", reaction_score), ("batak", batak_score)):
            await db.minigame_scores.insert_one(
                {
                    "id": _stable_id("minigame-score", f"{game_type}:{user_id}"),
                    "user_id": user_id,
                    "username": users_by_id[user_id].get("username"),
                    "game_type": game_type,
                    "score": score,
                    "league_id": primary_league["id"],
                    "race_id": race_id,
                    "season": F1_2026_SEASON,
                    "championship_id": F1_2026_CHAMPIONSHIP_ID,
                    "created_at": _iso(REFERENCE_DATE - timedelta(hours=5, minutes=member_index)),
                    "demo_seeded": True,
                    "seed_source": DEMO_SOURCE,
                }
            )

    return stats


async def _seed_notifications(host_users: list[dict]) -> None:
    notifications = [
        {
            "id": _stable_id("notification", "welcome"),
            "title": "Welcome to the paddock",
            "message": "Demo data loaded: leagues, picks, results, and mini-games.",
            "type": "info",
        },
        {
            "id": _stable_id("notification", "monaco-lock"),
            "title": "Monaco arrive",
            "message": "Predictions lock before Monaco qualifying.",
            "type": "important",
        },
        {
            "id": _stable_id("notification", "canada-results"),
            "title": "Resultats Canada publies",
            "message": "The demo leaderboard was recalculated after Montreal.",
            "type": "success",
        },
    ]

    for index, notification in enumerate(notifications):
        await db.notifications.insert_one(
            {
                **notification,
                "created_at": _iso(REFERENCE_DATE - timedelta(hours=3 - index)),
                "created_by": "demo-seed",
                "read": False,
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        )

    unread_ids = [notification["id"] for notification in notifications]
    for user in host_users:
        await db.users.update_one({"id": user["id"]}, {"$set": {"unread_notifications": unread_ids}})


async def _seed_feedback_and_media(host_users: list[dict]) -> None:
    host = host_users[0]
    feedbacks = [
        ("suggestion", "Add a league filter in the back-office predictions view."),
        ("bug", "On mobile, the reminder button must stay visible in the race list."),
        ("feedback", "The v2 glow theme gives a real futuristic paddock identity."),
    ]
    for index, (category, message) in enumerate(feedbacks):
        await db.feedback.insert_one(
            {
                "id": _stable_id("feedback", f"{category}:{index}"),
                "user_id": host["id"],
                "username": host.get("username", "Fred"),
                "email": host.get("email"),
                "category": category,
                "type": category,
                "message": message,
                "created_at": _iso(REFERENCE_DATE - timedelta(days=index, hours=2)),
                "read": index == 2,
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        )

    branding = Path("/Users/fred/Projects/Pronokif/_0-WORK/BRANDING/pronokif-logo3.png")
    if branding.exists():
        content = branding.read_bytes()
        await db.media.insert_one(
            {
                "id": _stable_id("media", "app-icon"),
                "filename": "pronokif-logo3.png",
                "original_name": "pronokif-logo3.png",
                "content_type": "image/png",
                "size": len(content),
                "data": base64.b64encode(content).decode("utf-8"),
                "entity_type": "branding",
                "entity_id": "app-icon",
                "uploaded_by": "demo-seed",
                "created_at": _iso(REFERENCE_DATE - timedelta(days=1)),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        )

    for race_id in ("monaco-2026", "canada-2026", "miami-2026"):
        race_file = Path(f"/Users/fred/Projects/Pronokif/frontend/public/images/races/{race_id}.webp")
        if not race_file.exists():
            continue
        content = race_file.read_bytes()
        await db.media.insert_one(
            {
                "id": _stable_id("media", race_id),
                "filename": f"{race_id}.webp",
                "original_name": f"{race_id}.webp",
                "content_type": "image/webp",
                "size": len(content),
                "data": base64.b64encode(content).decode("utf-8"),
                "entity_type": "race",
                "entity_id": race_id,
                "uploaded_by": "demo-seed",
                "created_at": _iso(REFERENCE_DATE - timedelta(hours=3)),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        )


async def _seed_settings() -> None:
    await db.app_settings.update_one(
        {"_id": "global"},
        {
            "$set": {
                "app_name": "Pronokif",
                "app_description": "Premium competitive F1 prediction game",
                "primary_color": "#E10600",
                "accent_color": "#4CD4FF",
                "logo_url": "/images/branding/pronokif-logo11.png",
                "favicon_url": "/images/branding/pronokif-logo3.png",
                "maintenance_mode": False,
                "registration_open": True,
                "max_leagues_per_user": 5,
                "current_season": 2026,
                "updated_at": _iso(REFERENCE_DATE),
                "demo_seeded": True,
                "seed_source": DEMO_SOURCE,
            }
        },
        upsert=True,
    )


async def _update_user_stats(
    *,
    users: list[dict],
    leagues: list[dict],
    points_by_user: dict[str, int],
    minigame_stats: dict[str, dict[str, int]],
) -> None:
    league_count_by_user: dict[str, int] = defaultdict(int)
    created_count_by_user: dict[str, int] = defaultdict(int)
    for league in leagues:
        for member_id in league["members"]:
            league_count_by_user[member_id] += 1
        created_count_by_user[league["created_by"]] += 1

    for user in users:
        user_id = user["id"]
        predictions_made = await db.predictions.count_documents({"user_id": user_id})
        race_predictions = await db.predictions.find({"user_id": user_id, "points_total": {"$exists": True}}).to_list(
            50
        )
        winners_correct = sum(
            1
            for prediction in race_predictions
            if prediction.get("points_breakdown", {}).get("race_winner", 0) > 0
        )
        poles_correct = sum(
            1
            for prediction in race_predictions
            if prediction.get("points_breakdown", {}).get("quali_pole", 0) > 0
        )
        custom_created = await db.custom_predictions.count_documents({"created_by": user_id})
        total_points = points_by_user.get(user_id, 0)
        mini = minigame_stats.get(user_id, {})

        stats = get_default_user_stats()
        stats.update(
            {
                "predictions_made": predictions_made,
                "predictions_correct": winners_correct + poles_correct,
                "weekends_complete": len(race_predictions),
                "poles_correct": poles_correct,
                "winners_correct": winners_correct,
                "leagues_joined": league_count_by_user.get(user_id, 0),
                "leagues_created": created_count_by_user.get(user_id, 0),
                "custom_preds_created": custom_created,
                "total_points": total_points,
                **mini,
            }
        )
        xp = 220 + predictions_made * 18 + total_points * 2 + league_count_by_user.get(user_id, 0) * 25
        level = get_level_from_xp(xp)
        await db.user_stats.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    **stats,
                    "updated_at": _iso(REFERENCE_DATE),
                    "demo_seeded": user.get("demo_seeded", False),
                    "seed_source": DEMO_SOURCE,
                }
            },
            upsert=True,
        )
        await db.users.update_one({"id": user_id}, {"$set": {"xp": xp, "level": level}})


async def seed_demo_data() -> dict[str, int]:
    random.seed(2026)
    await _cleanup_demo_data()
    races = await _seed_calendar()
    await _seed_championships()
    knowledge_summary = await seed_f1_2026_knowledge(actor="demo-seed")
    host_users = await _load_host_users()
    demo_users, demo_users_by_key = await _seed_demo_users()
    leagues = await _seed_leagues(host_users, demo_users_by_key)
    all_users = host_users + demo_users
    users_by_id = {user["id"]: user for user in all_users}
    result_docs = await _seed_results(races)
    points_by_user, last_race_points_by_user, _ = await _seed_predictions(
        races=races,
        result_docs=result_docs,
        users=all_users,
        host_users=host_users,
    )
    await _seed_leaderboards(
        leagues=leagues,
        users_by_id=users_by_id,
        points_by_user=points_by_user,
        last_race_points_by_user=last_race_points_by_user,
    )
    await _seed_chat(leagues, users_by_id, host_users)
    await _seed_custom_predictions(leagues, races, users_by_id)
    minigame_stats = await _seed_minigames(leagues, users_by_id)
    await _seed_notifications(host_users)
    await _seed_feedback_and_media(host_users)
    await _seed_settings()
    await _update_user_stats(
        users=all_users,
        leagues=leagues,
        points_by_user=points_by_user,
        minigame_stats=minigame_stats,
    )

    summary = {
        "users": await db.users.count_documents({}),
        "demo_users": await db.users.count_documents({"demo_seeded": True}),
        "championships": await db.championships.count_documents({}),
        "leagues": await db.leagues.count_documents({}),
        "races": await db.races.count_documents({}),
        "race_results": await db.race_results.count_documents({}),
        "predictions": await db.predictions.count_documents({}),
        "leaderboard": await db.leaderboard.count_documents({}),
        "league_messages": await db.league_messages.count_documents({}),
        "custom_predictions": await db.custom_predictions.count_documents({}),
        "custom_prediction_answers": await db.custom_prediction_answers.count_documents({}),
        "minigame_results": await db.minigame_results.count_documents({}),
        "notifications": await db.notifications.count_documents({}),
        "feedback": await db.feedback.count_documents({}),
        "media": await db.media.count_documents({}),
        "knowledge_entities": knowledge_summary["entities"]["total"],
        "knowledge_documents": knowledge_summary["documents"]["total"],
    }
    return summary


async def main() -> None:
    summary = await seed_demo_data()
    logger.info("Demo seed complete")
    print("\nPronokif demo seed complete")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print(f"\nDemo password for @{DEMO_EMAIL_DOMAIN} accounts: {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
