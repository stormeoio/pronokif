"""
PRONOKIF - Cagnotte (points kitty) service.

Computes cagnotte balance from minigame competition results.
Minigame scores are converted into cagnotte points using tier-based rules:

- Reaction (lower ms = better):
    <200ms → 50 pts, <250ms → 40 pts, <300ms → 30 pts,
    <350ms → 20 pts, <400ms → 15 pts, <500ms → 10 pts, >=500ms → 5 pts

- Batak (higher score = better):
    >=25 → 50 pts, >=20 → 40 pts, >=15 → 30 pts,
    >=10 → 20 pts, >=5 → 10 pts, <5 → 5 pts

Only competition results (is_training=False) count toward the cagnotte.
"""

from __future__ import annotations

from config import db


# ───────────────────────────────────── conversion rules ─


def reaction_score_to_points(reaction_ms: float) -> int:
    """Convert a reaction time (ms) to cagnotte points."""
    if reaction_ms < 200:
        return 50
    if reaction_ms < 250:
        return 40
    if reaction_ms < 300:
        return 30
    if reaction_ms < 350:
        return 20
    if reaction_ms < 400:
        return 15
    if reaction_ms < 500:
        return 10
    return 5


def batak_score_to_points(batak_score: float) -> int:
    """Convert a batak hit count to cagnotte points."""
    if batak_score >= 25:
        return 50
    if batak_score >= 20:
        return 40
    if batak_score >= 15:
        return 30
    if batak_score >= 10:
        return 20
    if batak_score >= 5:
        return 10
    return 5


def minigame_result_to_points(game_type: str, score: float) -> int:
    """Route a minigame result to the correct conversion function."""
    if game_type == "reaction":
        return reaction_score_to_points(score)
    if game_type == "batak":
        return batak_score_to_points(score)
    return 0


# ───────────────────────────────────── queries ─


async def get_cagnotte(user_id: str) -> dict:
    """Compute the full cagnotte state for a user.

    Returns balance, breakdown by game type, and recent entries.
    """
    # Fetch all competition results for this user
    results = (
        await db.minigame_results.find(
            {"user_id": user_id, "is_training": False},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .to_list(500)
    )

    total = 0
    reaction_total = 0
    batak_total = 0
    entries: list[dict] = []

    for r in results:
        game_type = r.get("game_type", "")
        score = r.get("score", 0)
        pts = minigame_result_to_points(game_type, score)
        total += pts

        if game_type == "reaction":
            reaction_total += pts
        elif game_type == "batak":
            batak_total += pts

        entries.append(
            {
                "id": r.get("id"),
                "game_type": game_type,
                "score": score,
                "points_earned": pts,
                "race_id": r.get("race_id"),
                "created_at": r.get("created_at"),
            }
        )

    return {
        "balance": total,
        "breakdown": {
            "reaction": reaction_total,
            "batak": batak_total,
        },
        "total_games": len(results),
        "history": entries[:20],  # last 20 entries
    }
