"""
PRONOKIF - Predictions service.

Shared helpers for predictions, extracted to avoid duplication between
server.py (legacy) and routes/predictions.py + new routes/profile.py.

The previous implementations diverged slightly: server.py counted bonus
sub-bets in detail, routes/predictions.py used a simpler heuristic. The
canonical version below mirrors the server.py logic (more granular —
this is what the public profile + admin views relied on) and applies it
to both classic and sprint bonus_bets.
"""
from __future__ import annotations

from config import db


async def count_individual_predictions(user_id: str) -> int:
    """Count individual prediction elements (not just documents) for a user.

    Each race document can contribute up to 8 picks (16 on sprint weekends):
    quali pole, quali top10, race winner, race top10, plus 4 bonus bets,
    then the same 8 for sprint sessions when present.
    """
    predictions = await db.predictions.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)
    total = 0

    for pred in predictions:
        # Classic race picks
        if pred.get("quali_pole"):
            total += 1
        if pred.get("quali_top10") and len(pred.get("quali_top10", [])) > 0:
            total += 1
        if pred.get("race_winner"):
            total += 1
        if pred.get("race_top10") and len(pred.get("race_top10", [])) > 0:
            total += 1
        # Classic bonus bets
        bonus = pred.get("bonus_bets") or {}
        if bonus:
            if bonus.get("safety_car") is not None:
                total += 1
            if bonus.get("dnf_drivers") and len(bonus.get("dnf_drivers", [])) > 0:
                total += 1
            if bonus.get("fastest_lap"):
                total += 1
            if bonus.get("first_corner_leader"):
                total += 1
        # Sprint picks
        if pred.get("sprint_quali_pole"):
            total += 1
        if pred.get("sprint_quali_top10") and len(pred.get("sprint_quali_top10", [])) > 0:
            total += 1
        if pred.get("sprint_race_winner"):
            total += 1
        if pred.get("sprint_race_top10") and len(pred.get("sprint_race_top10", [])) > 0:
            total += 1
        # Sprint bonus bets
        sbonus = pred.get("sprint_bonus_bets") or {}
        if sbonus:
            if sbonus.get("safety_car") is not None:
                total += 1
            if sbonus.get("dnf_drivers") and len(sbonus.get("dnf_drivers", [])) > 0:
                total += 1
            if sbonus.get("fastest_lap"):
                total += 1
            if sbonus.get("first_corner_leader"):
                total += 1

    return total
