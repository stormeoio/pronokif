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
    await db.predictions.create_index("championship_id")
    await db.predictions.create_index([("user_id", 1), ("race_id", 1)])
    await db.predictions.create_index([("championship_id", 1), ("race_id", 1)])
    await db.predictions.create_index("created_at")
    await db.predictions.create_index("locked")
    await db.predictions.create_index("review_status")

    # ── leagues ────────────────────────────────────────────────────
    await db.leagues.create_index("id", unique=True)
    await db.leagues.create_index("code", unique=True, sparse=True)
    await db.leagues.create_index("members")  # array field — multikey index
    await db.leagues.create_index("created_by")
    await db.leagues.create_index("created_at")
    await db.leagues.create_index("review_status")
    await db.leagues.create_index("is_archived")

    # ── leaderboard ────────────────────────────────────────────────
    await db.leaderboard.create_index("user_id")
    await db.leaderboard.create_index("league_id")
    await db.leaderboard.create_index("championship_id")
    await db.leaderboard.create_index([("league_id", 1), ("user_id", 1)])
    await db.leaderboard.create_index([("league_id", 1), ("user_id", 1), ("championship_id", 1)])
    await db.leaderboard.create_index([("league_id", 1), ("championship_id", 1)])
    await db.leaderboard.create_index([("league_id", 1), ("total_points", -1)])

    # ── races ──────────────────────────────────────────────────────
    await db.races.create_index("id", unique=True)
    await db.races.create_index("season")
    await db.races.create_index("championship_id")
    await db.races.create_index("date")

    # ── race_results ───────────────────────────────────────────────
    await db.race_results.create_index("race_id", unique=True)
    await db.race_results.create_index("championship_id")

    # ── prediction_scores ──────────────────────────────────────────
    await db.prediction_scores.create_index("id", unique=True)
    await db.prediction_scores.create_index("score_type")
    await db.prediction_scores.create_index("prediction_id")
    await db.prediction_scores.create_index("race_id")
    await db.prediction_scores.create_index("user_id")
    await db.prediction_scores.create_index("championship_id")
    await db.prediction_scores.create_index([("score_type", 1), ("prediction_id", 1)])
    await db.prediction_scores.create_index([("score_type", 1), ("race_id", 1), ("user_id", 1)])

    # ── championships ──────────────────────────────────────────────
    await db.championships.create_index("id", unique=True)
    await db.championships.create_index("slug", unique=True, sparse=True)
    await db.championships.create_index([("series", 1), ("season", -1)])

    # ── knowledge / RAG ───────────────────────────────────────────
    await db.knowledge_sources.create_index("id", unique=True)
    await db.knowledge_sources.create_index("namespace")
    await db.knowledge_entities.create_index("id", unique=True)
    await db.knowledge_entities.create_index("namespace")
    await db.knowledge_entities.create_index("championship_id")
    await db.knowledge_entities.create_index("entity_type")
    await db.knowledge_entities.create_index("canonical_key")
    await db.knowledge_entities.create_index("race_id")
    await db.knowledge_entities.create_index("team_id")
    await db.knowledge_entities.create_index("driver_id")
    await db.knowledge_entities.create_index([("namespace", 1), ("entity_type", 1)])
    await db.knowledge_entities.create_index([("championship_id", 1), ("entity_type", 1), ("canonical_key", 1)])
    await db.knowledge_entities.create_index([("championship_id", 1), ("entity_type", 1), ("race_id", 1)])
    await db.knowledge_entities.create_index([("search_text", "text")], default_language="none")
    await db.knowledge_documents.create_index("id", unique=True)
    await db.knowledge_documents.create_index("namespace")
    await db.knowledge_documents.create_index("championship_id")
    await db.knowledge_documents.create_index("entity_id")
    await db.knowledge_documents.create_index("entity_type")
    await db.knowledge_documents.create_index("locale")
    await db.knowledge_documents.create_index("updated_at")
    await db.knowledge_documents.create_index("embedding.status")
    await db.knowledge_documents.create_index("embedding.model")
    await db.knowledge_documents.create_index([("namespace", 1), ("entity_type", 1)])
    await db.knowledge_documents.create_index([("championship_id", 1), ("entity_type", 1), ("embedding.status", 1)])
    await db.knowledge_documents.create_index([("entity_id", 1), ("title", 1)])
    await db.knowledge_documents.create_index([("search_text", "text")], default_language="none")

    # ── circuit maps ──────────────────────────────────────────────
    await db.circuit_maps.create_index("key", unique=True)
    await db.circuit_maps.create_index("circuit_name")
    await db.circuit_maps.create_index("review_status")
    await db.circuit_maps.create_index("data_status")
    await db.circuit_maps.create_index("updated_at")
    await db.circuit_maps.create_index([("review_status", 1), ("updated_at", -1)])

    # ── legal pages ───────────────────────────────────────────────
    await db.legal_pages.create_index("slug", unique=True)
    await db.legal_pages.create_index("status")
    await db.legal_pages.create_index("order")

    # ── notifications ──────────────────────────────────────────────
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # ── feedback ───────────────────────────────────────────────────
    await db.feedback.create_index("id", unique=True)
    await db.feedback.create_index("read")
    await db.feedback.create_index("category")
    await db.feedback.create_index("status")
    await db.feedback.create_index("priority")
    await db.feedback.create_index("created_at")

    # ── user_sessions ──────────────────────────────────────────────
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index([("user_id", 1), ("login_at", -1)])

    # ── user magic links ───────────────────────────────────────────
    await db.user_magic_links.create_index("token_id", unique=True)
    await db.user_magic_links.create_index("user_id")
    await db.user_magic_links.create_index(
        "expires_at", expireAfterSeconds=0,  # TTL index: auto-delete expired links
    )

    # ── user_stats ─────────────────────────────────────────────────
    await db.user_stats.create_index("user_id", unique=True)

    # ── league_messages ────────────────────────────────────────────
    await db.league_messages.create_index([("league_id", 1), ("created_at", -1)])

    # ── custom_predictions ─────────────────────────────────────────
    await db.custom_predictions.create_index("created_by")
    await db.custom_predictions.create_index("championship_id")
    await db.custom_predictions.create_index([("league_id", 1), ("race_id", 1)])
    await db.custom_predictions.create_index([("championship_id", 1), ("race_id", 1)])

    # ── custom_prediction_answers ──────────────────────────────────
    await db.custom_prediction_answers.create_index("prediction_id")
    await db.custom_prediction_answers.create_index("league_id")
    await db.custom_prediction_answers.create_index("race_id")
    await db.custom_prediction_answers.create_index([("prediction_id", 1), ("user_id", 1)])
    await db.custom_prediction_answers.create_index("championship_id")

    # ── invitations ────────────────────────────────────────────────
    await db.invitations.create_index("email")
    await db.invitations.create_index("token", sparse=True)
    await db.invitations.create_index("accepted")
    await db.invitations.create_index("revoked")
    await db.invitations.create_index("sent_by")
    await db.invitations.create_index("created_at")
    await db.invitations.create_index("expires_at")
    await db.invitations.create_index("review_status")

    # ── admin ──────────────────────────────────────────────────────
    await db.admin_accounts.create_index("email", unique=True)
    await db.admin_magic_links.create_index("token_id", unique=True)
    await db.admin_magic_links.create_index(
        "expires_at", expireAfterSeconds=0,  # TTL index: auto-delete expired links
    )
    await db.admin_activity_logs.create_index("created_at")
    await db.admin_activity_logs.create_index("actor_email")
    await db.admin_activity_logs.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.admin_activity_logs.create_index("action")

    # ── media ──────────────────────────────────────────────────────
    await db.media.create_index("id", unique=True)

    # ── minigame_scores ────────────────────────────────────────────
    await db.minigame_scores.create_index("user_id")
    await db.minigame_scores.create_index("championship_id")
    await db.minigame_scores.create_index([("game", 1), ("league_id", 1), ("race_id", 1)])
    await db.minigame_results.create_index("championship_id")

    # ── user_missions ──────────────────────────────────────────────
    await db.user_missions.create_index([("user_id", 1), ("completed", 1)])

    logger.info("[MongoDB] All indexes ensured")
