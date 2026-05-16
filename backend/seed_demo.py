#!/usr/bin/env python3
"""
PRONOKIF — Demo data seeder.

Creates demo users, leagues, predictions, results, and leaderboards
to simulate a realistic multi-league F1 prediction game.

Usage:
    cd backend && .venv/bin/python seed_demo.py

Idempotent: drops all existing demo data first.
"""

import asyncio
import random
import uuid
from datetime import UTC, datetime

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

from config import DB_NAME, MONGO_URL
from data.f1_data import F1_DRIVERS_2026, F1_RACES_2026
from features import get_default_user_stats
from services.scoring import calculate_points

# ── Config ──────────────────────────────────────────────────────────
PASSWORD = "demo1234"
PASSWORD_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

DEMO_USERS = [
    {"username": "Patou",      "email": "patou@demo.pronokif.com"},
    {"username": "MaxFan33",   "email": "maxfan@demo.pronokif.com"},
    {"username": "LeclercFTW", "email": "leclerc@demo.pronokif.com"},
    {"username": "PitLane_Pro", "email": "pitlane@demo.pronokif.com"},
    {"username": "Turbo_Tina", "email": "tina@demo.pronokif.com"},
    {"username": "Senna_Jr",   "email": "senna@demo.pronokif.com"},
    {"username": "GridGirl44", "email": "grid44@demo.pronokif.com"},
    {"username": "DRS_King",   "email": "drs@demo.pronokif.com"},
    {"username": "Apex_Hunter", "email": "apex@demo.pronokif.com"},
    {"username": "BoxBoxBox",  "email": "boxbox@demo.pronokif.com"},
    {"username": "Safety_Car", "email": "safety@demo.pronokif.com"},
    {"username": "Slipstream", "email": "slip@demo.pronokif.com"},
]

DEMO_LEAGUES = [
    {
        "name": "Les Paddock Masters",
        "description": "La ligue des vrais connaisseurs F1",
        "members_idx": [0, 1, 2, 3, 4, 5],  # 6 members
    },
    {
        "name": "Scuderia Amici",
        "description": "Pour les fans de la Scuderia et du sport auto",
        "members_idx": [0, 2, 6, 7, 8],  # 5 members, Patou + LeclercFTW cross-league
    },
    {
        "name": "Turbo Senders",
        "description": "Pronostics rapides, résultats explosifs",
        "members_idx": [1, 4, 5, 9, 10, 11],  # 6 members, MaxFan + Turbo cross-league
    },
]

# Top drivers for realistic predictions
TOP_DRIVERS = [d["id"] for d in F1_DRIVERS_2026[:10]]
ALL_DRIVER_IDS = [d["id"] for d in F1_DRIVERS_2026]

# We'll simulate results for the first 5 past races
NUM_PAST_RACES = 5


def random_top10() -> list[str]:
    """Generate a random-ish top 10 from the driver pool."""
    pool = list(ALL_DRIVER_IDS)
    random.shuffle(pool)
    # Bias top drivers toward front
    top = [d for d in TOP_DRIVERS if random.random() > 0.3]
    others = [d for d in pool if d not in top]
    combined = top + others
    return combined[:10]


def realistic_prediction(actual_top10: list[str], accuracy: float) -> list[str]:
    """Generate a prediction that partially matches actual results.

    accuracy: 0.0 = random, 1.0 = perfect copy
    """
    pred = list(actual_top10)
    # Shuffle based on accuracy (lower accuracy = more shuffling)
    num_swaps = int((1 - accuracy) * 15)
    for _ in range(num_swaps):
        i = random.randint(0, 9)
        j = random.randint(0, len(ALL_DRIVER_IDS) - 1)
        if ALL_DRIVER_IDS[j] not in pred:
            pred[i] = ALL_DRIVER_IDS[j]
        else:
            # Just swap positions within top 10
            k = random.randint(0, 9)
            pred[i], pred[k] = pred[k], pred[i]
    return pred[:10]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("🏎️  PRONOKIF Demo Seeder")
    print("=" * 50)

    # ── Cleanup ─────────────────────────────────────────────────────
    demo_emails = [u["email"] for u in DEMO_USERS]
    existing_users = await db.users.find({"email": {"$in": demo_emails}}, {"id": 1}).to_list(100)
    demo_user_ids = [u["id"] for u in existing_users]

    if demo_user_ids:
        print(f"🧹 Cleaning {len(demo_user_ids)} existing demo users...")
        await db.users.delete_many({"id": {"$in": demo_user_ids}})
        await db.user_stats.delete_many({"user_id": {"$in": demo_user_ids}})
        await db.predictions.delete_many({"user_id": {"$in": demo_user_ids}})
        await db.leaderboard.delete_many({"user_id": {"$in": demo_user_ids}})
        await db.notifications.delete_many({"user_id": {"$in": demo_user_ids}})
        await db.user_sessions.delete_many({"user_id": {"$in": demo_user_ids}})

    # Clean demo leagues
    await db.leagues.delete_many({"description": {"$regex": "^(La ligue des|Pour les fans|Pronostics rapides)"}})

    # Clean demo race results (we'll re-seed them)
    past_race_ids = [r["id"] for r in F1_RACES_2026[:NUM_PAST_RACES]]
    await db.race_results.delete_many({"race_id": {"$in": past_race_ids}, "demo_seeded": True})

    # ── Create users ────────────────────────────────────────────────
    print("👥 Creating demo users...")
    users = []
    for i, u_data in enumerate(DEMO_USERS):
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": u_data["email"],
            "password_hash": PASSWORD_HASH,
            "username": u_data["username"],
            "current_league_id": None,  # set after leagues
            "xp": random.randint(50, 500),
            "level": random.randint(1, 8),
            "avatar_id": f"avatar_{random.randint(1, 20)}",
            "custom_avatar_url": None,
            "created_at": datetime(2026, 1, 1 + i, tzinfo=UTC).isoformat(),
        }
        await db.users.insert_one(user)
        await db.user_stats.insert_one({"user_id": user_id, **get_default_user_stats()})
        users.append(user)
        print(f"   ✅ {u_data['username']} ({u_data['email']})")

    # ── Create leagues ──────────────────────────────────────────────
    print("\n🏆 Creating demo leagues...")
    leagues = []
    for lg_data in DEMO_LEAGUES:
        league_id = str(uuid.uuid4())
        code = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=6))
        member_ids = [users[i]["id"] for i in lg_data["members_idx"]]
        creator_id = member_ids[0]

        league = {
            "id": league_id,
            "name": lg_data["name"],
            "code": code,
            "created_by": creator_id,
            "members": member_ids,
            "created_at": datetime(2026, 1, 15, tzinfo=UTC).isoformat(),
            "description": lg_data["description"],
        }
        await db.leagues.insert_one(league)
        leagues.append(league)

        # Set current_league_id for each member (first league they join)
        for uid in member_ids:
            user_doc = await db.users.find_one({"id": uid})
            if user_doc and not user_doc.get("current_league_id"):
                await db.users.update_one({"id": uid}, {"$set": {"current_league_id": league_id}})

        print(f"   ✅ {lg_data['name']} (code: {code}) — {len(member_ids)} membres")

    # ── Simulate race results for past races ────────────────────────
    print(f"\n🏁 Simulating results for {NUM_PAST_RACES} past races...")
    past_races = F1_RACES_2026[:NUM_PAST_RACES]
    race_results_map = {}

    for race in past_races:
        race_top10 = random_top10()
        quali_top10 = random_top10()

        results = {
            "quali_pole": quali_top10[0],
            "quali_top10": quali_top10,
            "sprint_quali_top10": [],
            "sprint_race_top10": [],
            "race_winner": race_top10[0],
            "race_top10": race_top10,
            "bonus": {
                "safety_car": random.choice([True, False]),
                "dnf_drivers": random.sample(ALL_DRIVER_IDS, random.randint(0, 3)),
                "fastest_lap": random.choice(race_top10[:5]),
                "first_corner_leader": random.choice(race_top10[:3]),
            },
        }

        await db.race_results.update_one(
            {"race_id": race["id"]},
            {
                "$set": {
                    "race_id": race["id"],
                    "results": results,
                    "entered_at": datetime.now(UTC).isoformat(),
                    "auto_synced": False,
                    "demo_seeded": True,
                }
            },
            upsert=True,
        )
        race_results_map[race["id"]] = results

        driver_name = next((d["name"] for d in F1_DRIVERS_2026 if d["id"] == race_top10[0]), race_top10[0])
        print(f"   🏁 {race['name']}: Vainqueur = {driver_name}")

    # ── Create predictions for each user × each past race ───────────
    print("\n📝 Creating predictions for all users...")
    total_predictions = 0

    # Skill levels per user (some are better predictors)
    skill_levels = {
        0: 0.6,   # Patou — good
        1: 0.75,  # MaxFan33 — very good
        2: 0.5,   # LeclercFTW — decent
        3: 0.8,   # PitLane_Pro — expert
        4: 0.4,   # Turbo_Tina — average
        5: 0.55,  # Senna_Jr — decent
        6: 0.3,   # GridGirl44 — casual
        7: 0.65,  # DRS_King — good
        8: 0.7,   # Apex_Hunter — good
        9: 0.45,  # BoxBoxBox — average
        10: 0.35, # Safety_Car — casual
        11: 0.5,  # Slipstream — decent
    }

    for race in past_races:
        results = race_results_map[race["id"]]

        for i, user in enumerate(users):
            # Some users skip some races (realistic)
            if random.random() < 0.1:
                continue

            accuracy = skill_levels.get(i, 0.5) + random.uniform(-0.15, 0.15)
            accuracy = max(0.1, min(0.9, accuracy))

            pred_quali = realistic_prediction(results["quali_top10"], accuracy)
            pred_race = realistic_prediction(results["race_top10"], accuracy)

            prediction = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "race_id": race["id"],
                "quali_pole": pred_quali[0] if random.random() < accuracy else random.choice(TOP_DRIVERS),
                "quali_top10": pred_quali,
                "race_winner": pred_race[0] if random.random() < accuracy else random.choice(TOP_DRIVERS),
                "race_top10": pred_race,
                "safety_car": random.choice([True, False]),
                "dnf_drivers": random.sample(ALL_DRIVER_IDS, random.randint(0, 3)),
                "fastest_lap": random.choice(TOP_DRIVERS),
                "first_corner_leader": random.choice(TOP_DRIVERS[:5]),
                "created_at": datetime(2026, 2, 20 + i % 8, tzinfo=UTC).isoformat(),
                "locked": True,
            }

            # Sprint predictions if applicable
            if race.get("is_sprint"):
                prediction["sprint_quali_pole"] = random.choice(TOP_DRIVERS)
                prediction["sprint_quali_top10"] = random_top10()
                prediction["sprint_race_winner"] = random.choice(TOP_DRIVERS)
                prediction["sprint_race_top10"] = random_top10()

            await db.predictions.insert_one(prediction)
            total_predictions += 1

    print(f"   ✅ {total_predictions} predictions created")

    # ── Calculate scores and build leaderboards ─────────────────────
    print("\n📊 Calculating scores and building leaderboards...")

    # Accumulate total points per user
    user_points: dict[str, int] = {u["id"]: 0 for u in users}
    user_last_race_points: dict[str, int] = {u["id"]: 0 for u in users}

    for race in past_races:
        results = race_results_map[race["id"]]
        preds = await db.predictions.find({"race_id": race["id"]}).to_list(100)

        for pred in preds:
            try:
                score = calculate_points(pred, results)
                user_points[pred["user_id"]] += score["total"]
                user_last_race_points[pred["user_id"]] = score["total"]

                # Update XP
                await db.users.update_one(
                    {"id": pred["user_id"]},
                    {"$inc": {"xp": score["xp_earned"]}},
                )
            except Exception:
                pass

    # Build leaderboard entries per league
    for league in leagues:
        # Sort members by total points
        member_points = [(uid, user_points.get(uid, 0)) for uid in league["members"]]
        member_points.sort(key=lambda x: x[1], reverse=True)

        for pos, (uid, pts) in enumerate(member_points, 1):
            await db.leaderboard.insert_one({
                "id": str(uuid.uuid4()),
                "league_id": league["id"],
                "user_id": uid,
                "total_points": pts,
                "last_race_points": user_last_race_points.get(uid, 0),
                "previous_position": max(1, pos + random.randint(-1, 1)),
            })

    # Update user levels based on XP
    for user in users:
        doc = await db.users.find_one({"id": user["id"]})
        if doc:
            xp = doc.get("xp", 0)
            level = min(20, 1 + xp // 100)
            await db.users.update_one({"id": user["id"]}, {"$set": {"level": level}})

    # ── Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("✅ Seed terminé !")
    print(f"   👥 {len(users)} users")
    print(f"   🏆 {len(leagues)} leagues")
    print(f"   🏁 {NUM_PAST_RACES} races with results")
    print(f"   📝 {total_predictions} predictions")
    print()
    print("🔑 Comptes de connexion :")
    print(f"   Mot de passe commun : {PASSWORD}")
    print()
    for u in DEMO_USERS[:6]:
        print(f"   📧 {u['email']} — {u['username']}")
    print(f"   ... et {len(DEMO_USERS) - 6} autres")
    print()
    print("🏆 Leagues :")
    for lg in leagues:
        print(f"   {lg['name']} — code: {lg['code']}")
    print()
    print("👥 Cross-league users :")
    print("   Patou → Paddock Masters + Scuderia Amici")
    print("   LeclercFTW → Paddock Masters + Scuderia Amici")
    print("   MaxFan33 → Paddock Masters + Turbo Senders")
    print("   Turbo_Tina → Paddock Masters + Turbo Senders")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
