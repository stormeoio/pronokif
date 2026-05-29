"""Scoring ledger reconciliation helpers.

The canonical leaderboard total for a league is:
  official race prediction points for each member
  + custom prediction points earned inside that league.

This module builds an auditable report and can repair leaderboard rows from
the score ledgers without touching profile XP, which may include missions or
other rewards.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from config import db
from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.league_membership import ensure_leaderboard_entry, leaderboard_query_for_league


def score_championship_query(championship_id: str) -> dict[str, Any]:
    return {
        "$or": [
            {"championship_id": championship_id},
            {"championship_id": {"$exists": False}},
            {"championship_id": None},
        ]
    }


def official_points_by_user(scores: list[dict]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for score in scores:
        if score.get("score_type") != "official_race":
            continue
        user_id = score.get("user_id")
        if not user_id:
            continue
        totals[user_id] = totals.get(user_id, 0) + int(score.get("points_total") or 0)
    return totals


def custom_points_by_league_user(custom_predictions: list[dict], answers: list[dict]) -> dict[tuple[str, str], int]:
    predictions_by_id = {
        prediction["id"]: prediction
        for prediction in custom_predictions
        if prediction.get("id") and prediction.get("league_id")
    }
    totals: dict[tuple[str, str], int] = {}

    for answer in answers:
        user_id = answer.get("user_id")
        if not user_id:
            continue
        league_id = answer.get("league_id")
        if not league_id:
            prediction = predictions_by_id.get(answer.get("prediction_id"))
            league_id = prediction.get("league_id") if prediction else None
        if not league_id:
            continue
        key = (league_id, user_id)
        totals[key] = totals.get(key, 0) + int(answer.get("points_awarded") or 0)
    return totals


def build_reconciliation_rows(
    *,
    league: dict,
    current_entries: list[dict],
    official_totals: dict[str, int],
    custom_totals: dict[tuple[str, str], int],
) -> list[dict]:
    entries_by_user = {entry.get("user_id"): entry for entry in current_entries if entry.get("user_id")}
    rows = []

    for position, user_id in enumerate(league.get("members") or [], start=1):
        official_points = official_totals.get(user_id, 0)
        custom_points = custom_totals.get((league["id"], user_id), 0)
        expected_total = official_points + custom_points
        current_entry = entries_by_user.get(user_id) or {}
        current_total = int(current_entry.get("total_points") or 0)
        rows.append(
            {
                "league_id": league["id"],
                "user_id": user_id,
                "entry_id": current_entry.get("id"),
                "position_hint": position,
                "current_total": current_total,
                "expected_total": expected_total,
                "delta": expected_total - current_total,
                "official_points": official_points,
                "custom_points": custom_points,
                "has_entry": bool(current_entry),
            }
        )

    return rows


def reconciliation_summary(rows: list[dict]) -> dict:
    mismatches = [row for row in rows if row["delta"] != 0 or not row["has_entry"]]
    return {
        "rows_count": len(rows),
        "mismatches": len(mismatches),
        "missing_entries": len([row for row in rows if not row["has_entry"]]),
        "positive_delta": sum(max(int(row["delta"]), 0) for row in mismatches),
        "negative_delta": sum(min(int(row["delta"]), 0) for row in mismatches),
    }


async def build_reconciliation_report(
    *,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    limit: int = 500,
) -> dict:
    score_query = {"score_type": "official_race", **score_championship_query(championship_id)}
    official_scores = await db.prediction_scores.find(score_query, {"_id": 0}).to_list(10000)
    official_totals = official_points_by_user(official_scores)

    custom_predictions = await db.custom_predictions.find(
        score_championship_query(championship_id), {"_id": 0}
    ).to_list(10000)
    custom_prediction_ids = [prediction["id"] for prediction in custom_predictions if prediction.get("id")]
    custom_answers = []
    if custom_prediction_ids:
        custom_answers = await db.custom_prediction_answers.find(
            {
                "prediction_id": {"$in": custom_prediction_ids},
                "points_awarded": {"$exists": True},
            },
            {"_id": 0},
        ).to_list(10000)
    custom_totals = custom_points_by_league_user(custom_predictions, custom_answers)

    leagues = await db.leagues.find(score_championship_query(championship_id), {"_id": 0}).to_list(limit)
    rows: list[dict] = []
    for league in leagues:
        current_entries = await db.leaderboard.find(leaderboard_query_for_league(league), {"_id": 0}).to_list(1000)
        rows.extend(
            build_reconciliation_rows(
                league=league,
                current_entries=current_entries,
                official_totals=official_totals,
                custom_totals=custom_totals,
            )
        )

    summary = reconciliation_summary(rows)
    return {
        "championship_id": championship_id,
        "summary": summary,
        "rows": sorted(rows, key=lambda row: (-abs(int(row["delta"])), row["league_id"], row["position_hint"])),
    }


async def apply_reconciliation(
    *,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
    actor: str | None = None,
    limit: int = 500,
) -> dict:
    report = await build_reconciliation_report(championship_id=championship_id, limit=limit)
    rows = report["rows"]
    now = datetime.now(UTC).isoformat()
    league_ids = list({row["league_id"] for row in rows})
    leagues = await db.leagues.find({"id": {"$in": league_ids}}, {"_id": 0}).to_list(10000)
    leagues_by_id = {
        league["id"]: league
        for league in leagues
    }
    repaired = 0

    for row in rows:
        if row["delta"] == 0 and row["has_entry"]:
            continue
        league = leagues_by_id.get(row["league_id"])
        if not league:
            continue
        entry = await ensure_leaderboard_entry(league, row["user_id"], previous_position=row["position_hint"])
        await db.leaderboard.update_one(
            {"id": entry["id"]},
            {
                "$set": {
                    "total_points": row["expected_total"],
                    "official_prediction_points": row["official_points"],
                    "custom_prediction_points": row["custom_points"],
                    "championship_id": championship_id,
                    "updated_at": now,
                    "reconciled_at": now,
                    "reconciled_by": actor,
                }
            },
        )
        repaired += 1

    return {
        **report,
        "applied": True,
        "repaired": repaired,
    }
