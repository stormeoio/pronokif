"""
PRONOKIF — Mission & achievement data constants.
Split from features.py (Sprint 4 R-001 compliance).
"""

MISSIONS = [
    # Regularity Missions
    {"id": "predictions_10", "name": "Rookie Predictor", "description": "Make 10 predictions", "category": "assiduity", "target": 10, "stat": "predictions_made", "xp_reward": 50, "icon": "target"},
    {"id": "predictions_50", "name": "Confirmed Predictor", "description": "Make 50 predictions", "category": "assiduity", "target": 50, "stat": "predictions_made", "xp_reward": 150, "icon": "target"},
    {"id": "predictions_100", "name": "Prediction Expert", "description": "Make 100 predictions", "category": "assiduity", "target": 100, "stat": "predictions_made", "xp_reward": 300, "icon": "target"},
    {"id": "predictions_500", "name": "Master Predictor", "description": "Make 500 predictions", "category": "assiduity", "target": 500, "stat": "predictions_made", "xp_reward": 750, "icon": "trophy"},
    {"id": "predictions_1000", "name": "Legend", "description": "Make 1000 predictions", "category": "assiduity", "target": 1000, "stat": "predictions_made", "xp_reward": 1500, "icon": "crown"},
    {"id": "weekends_complete_5", "name": "Weekend Warrior", "description": "Complete all picks for 5 weekends", "category": "assiduity", "target": 5, "stat": "weekends_complete", "xp_reward": 100, "icon": "calendar"},
    {"id": "weekends_complete_15", "name": "Regular", "description": "Complete all picks for 15 weekends", "category": "assiduity", "target": 15, "stat": "weekends_complete", "xp_reward": 300, "icon": "calendar"},
    {"id": "weekends_complete_25", "name": "Full Season", "description": "Complete all picks for 25 weekends", "category": "assiduity", "target": 25, "stat": "weekends_complete", "xp_reward": 1000, "icon": "flag"},
    # Performance Missions - Pole Position
    {"id": "pole_correct_1", "name": "First Pole", "description": "Pick pole position once", "category": "performance", "target": 1, "stat": "poles_correct", "xp_reward": 25, "icon": "flag"},
    {"id": "pole_correct_5", "name": "Pole Sitter", "description": "Pick pole position 5 times", "category": "performance", "target": 5, "stat": "poles_correct", "xp_reward": 75, "icon": "flag"},
    {"id": "pole_correct_10", "name": "Qualif Master", "description": "Pick pole position 10 times", "category": "performance", "target": 10, "stat": "poles_correct", "xp_reward": 150, "icon": "flag"},
    {"id": "pole_correct_15", "name": "Super Pole", "description": "Pick pole position 15 times", "category": "performance", "target": 15, "stat": "poles_correct", "xp_reward": 300, "icon": "zap"},
    {"id": "pole_correct_25", "name": "Pole Legend", "description": "Pick pole position 25 times", "category": "performance", "target": 25, "stat": "poles_correct", "xp_reward": 500, "icon": "crown"},
    # Performance Missions - Race Winner
    {"id": "winner_correct_1", "name": "First Win", "description": "Pick the winner once", "category": "performance", "target": 1, "stat": "winners_correct", "xp_reward": 30, "icon": "trophy"},
    {"id": "winner_correct_5", "name": "Winner", "description": "Pick the winner 5 times", "category": "performance", "target": 5, "stat": "winners_correct", "xp_reward": 100, "icon": "trophy"},
    {"id": "winner_correct_10", "name": "Race Master", "description": "Pick the winner 10 times", "category": "performance", "target": 10, "stat": "winners_correct", "xp_reward": 200, "icon": "trophy"},
    {"id": "winner_correct_15", "name": "Champion", "description": "Pick the winner 15 times", "category": "performance", "target": 15, "stat": "winners_correct", "xp_reward": 400, "icon": "medal"},
    {"id": "winner_correct_25", "name": "Winner Legend", "description": "Pick the winner 25 times", "category": "performance", "target": 25, "stat": "winners_correct", "xp_reward": 750, "icon": "crown"},
    # Performance Missions - Total Correct Predictions
    {"id": "correct_10", "name": "On Form", "description": "10 successful predictions", "category": "performance", "target": 10, "stat": "predictions_correct", "xp_reward": 50, "icon": "check"},
    {"id": "correct_50", "name": "On a Streak", "description": "50 successful predictions", "category": "performance", "target": 50, "stat": "predictions_correct", "xp_reward": 200, "icon": "check"},
    {"id": "correct_100", "name": "Accuracy King", "description": "100 successful predictions", "category": "performance", "target": 100, "stat": "predictions_correct", "xp_reward": 500, "icon": "target"},
    {"id": "correct_500", "name": "Oracle", "description": "500 successful predictions", "category": "performance", "target": 500, "stat": "predictions_correct", "xp_reward": 1500, "icon": "eye"},
    # Bonus Missions
    {"id": "safety_car_5", "name": "Safety First", "description": "5 Safety Car corrects", "category": "performance", "target": 5, "stat": "safety_car_correct", "xp_reward": 75, "icon": "alert-triangle"},
    {"id": "fastest_lap_5", "name": "Speed Demon", "description": "5 Fastest Lap corrects", "category": "performance", "target": 5, "stat": "fastest_lap_correct", "xp_reward": 100, "icon": "zap"},
    {"id": "first_corner_5", "name": "Turn 1 Expert", "description": "5 correct Turn 1 leaders", "category": "performance", "target": 5, "stat": "first_corner_correct", "xp_reward": 100, "icon": "corner-down-right"},
    {"id": "dnf_10", "name": "Crash Predictor", "description": "10 correct DNF drivers", "category": "performance", "target": 10, "stat": "dnf_correct", "xp_reward": 150, "icon": "x-circle"},
    # Social Missions
    {"id": "leagues_joined_3", "name": "Social", "description": "Join 3 leagues", "category": "social", "target": 3, "stat": "leagues_joined", "xp_reward": 50, "icon": "users"},
    {"id": "league_created", "name": "Leader", "description": "Create a league", "category": "social", "target": 1, "stat": "leagues_created", "xp_reward": 30, "icon": "plus-circle"},
    {"id": "custom_pred_5", "name": "Creative", "description": "Create 5 custom predictions", "category": "social", "target": 5, "stat": "custom_preds_created", "xp_reward": 75, "icon": "edit"},
    # Mini-game Missions
    {"id": "reaction_games_10", "name": "Reflexes", "description": "Play 10 Reaction games", "category": "minigames", "target": 10, "stat": "reaction_games_played", "xp_reward": 50, "icon": "zap"},
    {"id": "reaction_win_5", "name": "Quick Start", "description": "Win 5 Reaction games", "category": "minigames", "target": 5, "stat": "reaction_wins", "xp_reward": 100, "icon": "zap"},
    {"id": "batak_games_10", "name": "Batak Lover", "description": "Play 10 Batak games", "category": "minigames", "target": 10, "stat": "batak_games_played", "xp_reward": 50, "icon": "target"},
    {"id": "batak_win_5", "name": "Batak Master", "description": "Win 5 Batak games", "category": "minigames", "target": 5, "stat": "batak_wins", "xp_reward": 100, "icon": "target"},
    {"id": "reaction_sub_200", "name": "Lightning", "description": "Reaction time < 200ms", "category": "minigames", "target": 1, "stat": "reaction_sub_200", "xp_reward": 150, "icon": "bolt"},
    {"id": "batak_30_targets", "name": "Target Hunter", "description": "30 targets in one Batak game", "category": "minigames", "target": 1, "stat": "batak_30_targets", "xp_reward": 150, "icon": "target"},
]
