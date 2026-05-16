"""
PRONOKIF — Avatar data constants.
Split from features.py (Sprint 4 R-001 compliance).
"""

# Default avatars - Classic icons
DEFAULT_AVATARS = [
    # Animals
    {"id": "avatar_wolf", "name": "Loup", "category": "animals", "icon": "wolf"},
    {"id": "avatar_eagle", "name": "Aigle", "category": "animals", "icon": "eagle"},
    {"id": "avatar_lion", "name": "Lion", "category": "animals", "icon": "lion"},
    {"id": "avatar_shark", "name": "Requin", "category": "animals", "icon": "shark"},
    {"id": "avatar_phoenix", "name": "Phoenix", "category": "animals", "icon": "phoenix"},
    # Gaming
    {"id": "avatar_controller", "name": "Gamer", "category": "gaming", "icon": "gamepad"},
    {"id": "avatar_trophy", "name": "Champion", "category": "gaming", "icon": "trophy"},
    {"id": "avatar_star", "name": "Star", "category": "gaming", "icon": "star"},
    {"id": "avatar_crown", "name": "King", "category": "gaming", "icon": "crown"},
    {"id": "avatar_rocket", "name": "Rocket", "category": "gaming", "icon": "rocket"},
    # Abstract
    {"id": "avatar_fire", "name": "Fire", "category": "abstract", "icon": "flame"},
    {"id": "avatar_bolt", "name": "Eclair", "category": "abstract", "icon": "zap"},
    {"id": "avatar_target", "name": "Target", "category": "abstract", "icon": "target"},
    {"id": "avatar_shield", "name": "Shield", "category": "abstract", "icon": "shield"},
    {"id": "avatar_gem", "name": "Gem", "category": "abstract", "icon": "gem"},
]

# Team-inspired avatars (stylized, not official logos)
TEAM_AVATARS = [
    {"id": "team_redbull", "name": "Taureau Bleu", "category": "teams", "colors": ["#3671C6", "#1E3A6E"], "team": "Red Bull Racing"},
    {"id": "team_ferrari", "name": "Cavallino", "category": "teams", "colors": ["#F91536", "#7B0A1A"], "team": "Ferrari"},
    {"id": "team_mclaren", "name": "Papaye", "category": "teams", "colors": ["#FF8000", "#47C7FC"], "team": "McLaren"},
    {"id": "team_mercedes", "name": "Flèches d'Argent", "category": "teams", "colors": ["#27F4D2", "#000000"], "team": "Mercedes"},
    {"id": "team_astonmartin", "name": "Racing Green", "category": "teams", "colors": ["#229971", "#0D3B2D"], "team": "Aston Martin"},
    {"id": "team_alpine", "name": "Bleu Alpine", "category": "teams", "colors": ["#0093CC", "#FF69B4"], "team": "Alpine"},
    {"id": "team_williams", "name": "Grove Blue", "category": "teams", "colors": ["#64C4FF", "#00205B"], "team": "Williams"},
    {"id": "team_rb", "name": "VCARB", "category": "teams", "colors": ["#6692FF", "#1E3264"], "team": "RB"},
    {"id": "team_sauber", "name": "Kick Green", "category": "teams", "colors": ["#52E252", "#000000"], "team": "Sauber"},
    {"id": "team_haas", "name": "Stars & Stripes", "category": "teams", "colors": ["#B6BABD", "#FFFFFF"], "team": "Haas"},
]

# Driver silhouette avatars (with helmet number)
DRIVER_AVATARS = [
    {"id": "driver_1", "name": "#1 Verstappen", "category": "drivers", "number": 1, "colors": ["#3671C6", "#FFD700"]},
    {"id": "driver_30", "name": "#30 Lawson", "category": "drivers", "number": 30, "colors": ["#3671C6", "#FFFFFF"]},
    {"id": "driver_44", "name": "#44 Hamilton", "category": "drivers", "number": 44, "colors": ["#F91536", "#FFD700"]},
    {"id": "driver_16", "name": "#16 Leclerc", "category": "drivers", "number": 16, "colors": ["#F91536", "#FFFFFF"]},
    {"id": "driver_4", "name": "#4 Norris", "category": "drivers", "number": 4, "colors": ["#FF8000", "#47C7FC"]},
    {"id": "driver_81", "name": "#81 Piastri", "category": "drivers", "number": 81, "colors": ["#FF8000", "#FFFFFF"]},
    {"id": "driver_63", "name": "#63 Russell", "category": "drivers", "number": 63, "colors": ["#27F4D2", "#000000"]},
    {"id": "driver_12", "name": "#12 Antonelli", "category": "drivers", "number": 12, "colors": ["#27F4D2", "#FFFFFF"]},
    {"id": "driver_14", "name": "#14 Alonso", "category": "drivers", "number": 14, "colors": ["#229971", "#FFD700"]},
    {"id": "driver_18", "name": "#18 Stroll", "category": "drivers", "number": 18, "colors": ["#229971", "#FFFFFF"]},
    {"id": "driver_10", "name": "#10 Gasly", "category": "drivers", "number": 10, "colors": ["#0093CC", "#FF69B4"]},
    {"id": "driver_7", "name": "#7 Doohan", "category": "drivers", "number": 7, "colors": ["#0093CC", "#FFFFFF"]},
    {"id": "driver_23", "name": "#23 Albon", "category": "drivers", "number": 23, "colors": ["#64C4FF", "#E10600"]},
    {"id": "driver_55", "name": "#55 Sainz", "category": "drivers", "number": 55, "colors": ["#64C4FF", "#FFFFFF"]},
    {"id": "driver_22", "name": "#22 Tsunoda", "category": "drivers", "number": 22, "colors": ["#6692FF", "#FFFFFF"]},
    {"id": "driver_6", "name": "#6 Hadjar", "category": "drivers", "number": 6, "colors": ["#6692FF", "#E10600"]},
    {"id": "driver_27", "name": "#27 Hulkenberg", "category": "drivers", "number": 27, "colors": ["#52E252", "#000000"]},
    {"id": "driver_5", "name": "#5 Bortoleto", "category": "drivers", "number": 5, "colors": ["#52E252", "#FFD700"]},
    {"id": "driver_31", "name": "#31 Ocon", "category": "drivers", "number": 31, "colors": ["#B6BABD", "#E10600"]},
    {"id": "driver_87", "name": "#87 Bearman", "category": "drivers", "number": 87, "colors": ["#B6BABD", "#000000"]},
]

ALL_AVATARS = DEFAULT_AVATARS + TEAM_AVATARS + DRIVER_AVATARS
