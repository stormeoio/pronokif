"""
PRONOKIF - MongoDB Index Definitions.

Called once at application startup to ensure indexes exist.
Motor's create_index is idempotent (no-op if the index already exists).
"""

from __future__ import annotations

from config import db, logger


async def ensure_indexes() -> None:
    """Create all required MongoDB indexes."""

    # ── users ──────────────────────────────────────────────────────
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", sparse=True)  # null for new users
    await db.users.create_index("created_at")
    await db.users.create_index("email_verification_token", sparse=True)
    await db.users.create_index("reset_password_token", sparse=True)

    # ── predictions ────────────────────────────────────────────────
    await db.predictions.create_index("user_id")
    await db.predictions.create_index("race_id")
    await db.predictions.create_index([("user_id", 1), ("race_id", 1)])
    await db.predictions.create_index("created_at")

    # ── leagues ────────────────────────────────────────────────────
    await db.leagues.create_index("id", unique=True)
    await db.leagues.create_index("code", unique=True, sparse=True)
    await db.leagues.create_index("members")  # array field — multikey index
    await db.leagues.create_index("created_by")

    # ── leaderboard ────────────────────────────────────────────────
    await db.leaderboard.create_index("user_id")
    await db.leaderboard.create_index("league_id")
    await db.leaderboard.create_index([("league_id", 1), ("user_id", 1)])
    await db.leaderboard.create_index([("league_id", 1), ("total_points", -1)])

    # ── races ──────────────────────────────────────────────────────
    await db.races.create_index("id", unique=True)
    await db.races.create_index("season")
    await db.races.create_index("date")

    # ── race_results ───────────────────────────────────────────────
    await db.race_results.create_index("race_id", unique=True)

    # ── notifications ──────────────────────────────────────────────
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # ── feedback ───────────────────────────────────────────────────
    await db.feedback.create_index("id", unique=True)
    await db.feedback.create_index("read")
    await db.feedback.create_index("created_at")

    # ── user_sessions ──────────────────────────────────────────────
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index([("user_id", 1), ("login_at", -1)])

    # ── user_stats ─────────────────────────────────────────────────
    await db.user_stats.create_index("user_id", unique=True)

    # ── league_messages ────────────────────────────────────────────
    await db.league_messages.create_index([("league_id", 1), ("created_at", -1)])

    # ── custom_predictions ─────────────────────────────────────────
    await db.custom_predictions.create_index("created_by")
    await db.custom_predictions.create_index([("league_id", 1), ("race_id", 1)])

    # ── custom_prediction_answers ──────────────────────────────────
    await db.custom_prediction_answers.create_index("prediction_id")

    # ── invitations ────────────────────────────────────────────────
    await db.invitations.create_index("email")
    await db.invitations.create_index("token", sparse=True)

    # ── admin ──────────────────────────────────────────────────────
    await db.admin_accounts.create_index("email", unique=True)
    await db.admin_magic_links.create_index("token_id", unique=True)
    await db.admin_magic_links.create_index(
        "expires_at", expireAfterSeconds=0,  # TTL index: auto-delete expired links
    )

    # ── media ──────────────────────────────────────────────────────
    await db.media.create_index("id", unique=True)

    # ── minigame_scores ────────────────────────────────────────────
    await db.minigame_scores.create_index("user_id")
    await db.minigame_scores.create_index([("game", 1), ("league_id", 1), ("race_id", 1)])

    # ── user_missions ──────────────────────────────────────────────
    await db.user_missions.create_index([("user_id", 1), ("completed", 1)])

    logger.info("[MongoDB] All indexes ensured (%d collections)", 18)
