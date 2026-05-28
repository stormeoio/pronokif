"""
PRONOKIF - Scoring Service
Points calculation for predictions
"""

from config import SCORING_RULES, XP_REWARDS_SCORING


def calculate_points(prediction: dict, results: dict) -> dict:
    """
    Calculate points for a prediction against actual results.
    Returns a dict with detailed breakdown of points earned.
    """
    points = {
        "quali_pole": 0,
        "quali_top10": 0,
        "sprint_quali_top10": 0,
        "sprint_race_top10": 0,
        "race_winner": 0,
        "race_top10": 0,
        "bonus": 0,
        "total": 0,
        "xp_earned": 0,
        "details": [],
    }

    # Quali Pole
    if prediction.get("quali_pole") == results.get("quali_pole"):
        points["quali_pole"] = SCORING_RULES["quali_pole_exact"]
        points["xp_earned"] += XP_REWARDS_SCORING["correct_pole"]
        points["details"].append(f"Pole exacte: +{SCORING_RULES['quali_pole_exact']} pts")

    # Quali Top 10
    actual_quali = results.get("quali_top10", [])
    for i, driver in enumerate(prediction.get("quali_top10", [])):
        if i < len(actual_quali) and driver == actual_quali[i]:
            points["quali_top10"] += SCORING_RULES["top10_exact_position"]
            points["details"].append(f"Quali P{i + 1} exact: +3 pts")
        elif driver in actual_quali:
            points["quali_top10"] += SCORING_RULES["top10_in_top10"]

    # Sprint Quali Top 10
    actual_sprint_quali = results.get("sprint_quali_top10", [])
    for i, driver in enumerate(prediction.get("sprint_quali_top10") or []):
        if i < len(actual_sprint_quali) and driver == actual_sprint_quali[i]:
            points["sprint_quali_top10"] += SCORING_RULES["top10_exact_position"]
        elif driver in actual_sprint_quali:
            points["sprint_quali_top10"] += SCORING_RULES["top10_in_top10"]

    # Sprint Race Top 10
    actual_sprint_race = results.get("sprint_race_top10", [])
    for i, driver in enumerate(prediction.get("sprint_race_top10") or []):
        if i < len(actual_sprint_race) and driver == actual_sprint_race[i]:
            points["sprint_race_top10"] += SCORING_RULES["top10_exact_position"]
        elif driver in actual_sprint_race:
            points["sprint_race_top10"] += SCORING_RULES["top10_in_top10"]

    # Race Winner
    if prediction.get("race_winner") == results.get("race_winner"):
        points["race_winner"] = SCORING_RULES["race_winner_exact"]
        points["xp_earned"] += XP_REWARDS_SCORING["correct_winner"]
        points["details"].append("Vainqueur exact: +10 pts")

    # Race Top 10
    actual_race = results.get("race_top10", [])
    for i, driver in enumerate(prediction.get("race_top10", [])):
        if i < len(actual_race) and driver == actual_race[i]:
            points["race_top10"] += SCORING_RULES["top10_exact_position"]
            points["details"].append(f"Course P{i + 1} exact: +3 pts")
        elif driver in actual_race:
            points["race_top10"] += SCORING_RULES["top10_in_top10"]

    # Bonus Bets
    pred_bonus = prediction.get("bonus_bets", {}) or {}
    results_bonus = results.get("bonus", {}) or {}

    # Safety Car (only award when both sides have an explicit value)
    pred_sc = pred_bonus.get("safety_car")
    actual_sc = results_bonus.get("safety_car")
    if pred_sc is not None and actual_sc is not None and pred_sc == actual_sc:
        points["bonus"] += SCORING_RULES["safety_car_correct"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Safety Car correct: +3 pts")

    # DNF Drivers (points per correct driver)
    pred_dnf = pred_bonus.get("dnf_drivers", [])
    actual_dnf = results_bonus.get("dnf_drivers", [])
    for driver in pred_dnf:
        if driver in actual_dnf:
            points["bonus"] += SCORING_RULES["dnf_driver_correct"]
            points["details"].append(f"DNF {driver} correct: +2 pts")

    # Fastest Lap
    pred_fl = pred_bonus.get("fastest_lap_driver")
    actual_fl = results_bonus.get("fastest_lap")
    if pred_fl is not None and actual_fl is not None and pred_fl == actual_fl:
        points["bonus"] += SCORING_RULES["fastest_lap_correct"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Fastest lap exact: +5 pts")

    # First Corner Leader
    pred_fcl = pred_bonus.get("first_corner_leader")
    actual_fcl = results_bonus.get("first_corner_leader")
    if pred_fcl is not None and actual_fcl is not None and pred_fcl == actual_fcl:
        points["bonus"] += SCORING_RULES["first_corner_leader"]
        points["xp_earned"] += XP_REWARDS_SCORING["bonus_correct"]
        points["details"].append("Leader 1er virage exact: +3 pts")

    points["total"] = (
        points["quali_pole"]
        + points["quali_top10"]
        + points["sprint_quali_top10"]
        + points["sprint_race_top10"]
        + points["race_winner"]
        + points["race_top10"]
        + points["bonus"]
    )
    return points
