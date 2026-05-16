"""
PRONOKIF — Mission & achievement data constants.
Split from features.py (Sprint 4 R-001 compliance).
"""

MISSIONS = [
    # Assiduity Missions
    {"id": "predictions_10", "name": "Apprenti Pronostiqueur", "description": "Réaliser 10 pronostics", "category": "assiduity", "target": 10, "stat": "predictions_made", "xp_reward": 50, "icon": "target"},
    {"id": "predictions_50", "name": "Pronostiqueur Confirmé", "description": "Réaliser 50 pronostics", "category": "assiduity", "target": 50, "stat": "predictions_made", "xp_reward": 150, "icon": "target"},
    {"id": "predictions_100", "name": "Expert en Pronostics", "description": "Réaliser 100 pronostics", "category": "assiduity", "target": 100, "stat": "predictions_made", "xp_reward": 300, "icon": "target"},
    {"id": "predictions_500", "name": "Maître Pronostiqueur", "description": "Réaliser 500 pronostics", "category": "assiduity", "target": 500, "stat": "predictions_made", "xp_reward": 750, "icon": "trophy"},
    {"id": "predictions_1000", "name": "Légende", "description": "Réaliser 1000 pronostics", "category": "assiduity", "target": 1000, "stat": "predictions_made", "xp_reward": 1500, "icon": "crown"},
    {"id": "weekends_complete_5", "name": "Weekend Warrior", "description": "Compléter tous les pronos de 5 weekends", "category": "assiduity", "target": 5, "stat": "weekends_complete", "xp_reward": 100, "icon": "calendar"},
    {"id": "weekends_complete_15", "name": "Assidu", "description": "Compléter tous les pronos de 15 weekends", "category": "assiduity", "target": 15, "stat": "weekends_complete", "xp_reward": 300, "icon": "calendar"},
    {"id": "weekends_complete_25", "name": "Saison Complète", "description": "Compléter tous les pronos de 25 weekends", "category": "assiduity", "target": 25, "stat": "weekends_complete", "xp_reward": 1000, "icon": "flag"},
    # Performance Missions - Pole Position
    {"id": "pole_correct_1", "name": "Premier Pole", "description": "Trouver la pole position 1 fois", "category": "performance", "target": 1, "stat": "poles_correct", "xp_reward": 25, "icon": "flag"},
    {"id": "pole_correct_5", "name": "Pole Sitter", "description": "Trouver la pole position 5 fois", "category": "performance", "target": 5, "stat": "poles_correct", "xp_reward": 75, "icon": "flag"},
    {"id": "pole_correct_10", "name": "Qualif Master", "description": "Trouver la pole position 10 fois", "category": "performance", "target": 10, "stat": "poles_correct", "xp_reward": 150, "icon": "flag"},
    {"id": "pole_correct_15", "name": "Super Pole", "description": "Trouver la pole position 15 fois", "category": "performance", "target": 15, "stat": "poles_correct", "xp_reward": 300, "icon": "zap"},
    {"id": "pole_correct_25", "name": "Pole Legend", "description": "Trouver la pole position 25 fois", "category": "performance", "target": 25, "stat": "poles_correct", "xp_reward": 500, "icon": "crown"},
    # Performance Missions - Race Winner
    {"id": "winner_correct_1", "name": "Premier Victoire", "description": "Trouver le vainqueur 1 fois", "category": "performance", "target": 1, "stat": "winners_correct", "xp_reward": 30, "icon": "trophy"},
    {"id": "winner_correct_5", "name": "Vainqueur", "description": "Trouver le vainqueur 5 fois", "category": "performance", "target": 5, "stat": "winners_correct", "xp_reward": 100, "icon": "trophy"},
    {"id": "winner_correct_10", "name": "Race Master", "description": "Trouver le vainqueur 10 fois", "category": "performance", "target": 10, "stat": "winners_correct", "xp_reward": 200, "icon": "trophy"},
    {"id": "winner_correct_15", "name": "Champion", "description": "Trouver le vainqueur 15 fois", "category": "performance", "target": 15, "stat": "winners_correct", "xp_reward": 400, "icon": "medal"},
    {"id": "winner_correct_25", "name": "Winner Legend", "description": "Trouver le vainqueur 25 fois", "category": "performance", "target": 25, "stat": "winners_correct", "xp_reward": 750, "icon": "crown"},
    # Performance Missions - Total Correct Predictions
    {"id": "correct_10", "name": "En Forme", "description": "10 pronostics réussis", "category": "performance", "target": 10, "stat": "predictions_correct", "xp_reward": 50, "icon": "check"},
    {"id": "correct_50", "name": "Sur une Série", "description": "50 pronostics réussis", "category": "performance", "target": 50, "stat": "predictions_correct", "xp_reward": 200, "icon": "check"},
    {"id": "correct_100", "name": "Accuracy King", "description": "100 pronostics réussis", "category": "performance", "target": 100, "stat": "predictions_correct", "xp_reward": 500, "icon": "target"},
    {"id": "correct_500", "name": "Oracle", "description": "500 pronostics réussis", "category": "performance", "target": 500, "stat": "predictions_correct", "xp_reward": 1500, "icon": "eye"},
    # Bonus Missions
    {"id": "safety_car_5", "name": "Safety First", "description": "5 Safety Car corrects", "category": "performance", "target": 5, "stat": "safety_car_correct", "xp_reward": 75, "icon": "alert-triangle"},
    {"id": "fastest_lap_5", "name": "Speed Demon", "description": "5 Fastest Lap corrects", "category": "performance", "target": 5, "stat": "fastest_lap_correct", "xp_reward": 100, "icon": "zap"},
    {"id": "first_corner_5", "name": "Turn 1 Expert", "description": "5 Leader 1er virage corrects", "category": "performance", "target": 5, "stat": "first_corner_correct", "xp_reward": 100, "icon": "corner-down-right"},
    {"id": "dnf_10", "name": "Crash Predictor", "description": "10 DNF pilotes corrects", "category": "performance", "target": 10, "stat": "dnf_correct", "xp_reward": 150, "icon": "x-circle"},
    # Social Missions
    {"id": "leagues_joined_3", "name": "Social", "description": "Rejoindre 3 ligues", "category": "social", "target": 3, "stat": "leagues_joined", "xp_reward": 50, "icon": "users"},
    {"id": "league_created", "name": "Leader", "description": "Créer une ligue", "category": "social", "target": 1, "stat": "leagues_created", "xp_reward": 30, "icon": "plus-circle"},
    {"id": "custom_pred_5", "name": "Créatif", "description": "Créer 5 pronostics personnalisés", "category": "social", "target": 5, "stat": "custom_preds_created", "xp_reward": 75, "icon": "edit"},
    # Mini-game Missions
    {"id": "reaction_games_10", "name": "Réflexes", "description": "Jouer 10 parties Reaction", "category": "minigames", "target": 10, "stat": "reaction_games_played", "xp_reward": 50, "icon": "zap"},
    {"id": "reaction_win_5", "name": "Quick Start", "description": "Gagner 5 fois au Reaction", "category": "minigames", "target": 5, "stat": "reaction_wins", "xp_reward": 100, "icon": "zap"},
    {"id": "batak_games_10", "name": "Batak Lover", "description": "Jouer 10 parties Batak", "category": "minigames", "target": 10, "stat": "batak_games_played", "xp_reward": 50, "icon": "target"},
    {"id": "batak_win_5", "name": "Batak Master", "description": "Gagner 5 fois au Batak", "category": "minigames", "target": 5, "stat": "batak_wins", "xp_reward": 100, "icon": "target"},
    {"id": "reaction_sub_200", "name": "Lightning", "description": "Temps de réaction < 200ms", "category": "minigames", "target": 1, "stat": "reaction_sub_200", "xp_reward": 150, "icon": "bolt"},
    {"id": "batak_30_targets", "name": "Target Hunter", "description": "30 cibles en une partie Batak", "category": "minigames", "target": 1, "stat": "batak_30_targets", "xp_reward": 150, "icon": "target"},
]
