"""
Unit tests for the scoring engine (services/scoring.py).

Tests calculate_points with various prediction/result combinations:
- Perfect prediction (all correct)
- Partial matches (in top10 but wrong position)
- Zero matches (completely wrong)
- Bonus bets (safety car, DNF, fastest lap, first corner leader)
- Sprint weekend scoring
- Edge cases (empty predictions, missing fields)
"""


from services.scoring import calculate_points

# ── Fixtures ─────────────────────────────────────────────────────────────────

DRIVERS = [f"driver_{i}" for i in range(1, 21)]  # driver_1 .. driver_20


def _full_results() -> dict:
    """Realistic race results for testing."""
    return {
        "quali_pole": DRIVERS[0],
        "quali_top10": DRIVERS[:10],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": DRIVERS[2],
        "race_top10": [DRIVERS[2], DRIVERS[0], DRIVERS[4], DRIVERS[1],
                       DRIVERS[7], DRIVERS[3], DRIVERS[9], DRIVERS[5],
                       DRIVERS[6], DRIVERS[8]],
        "bonus": {
            "safety_car": True,
            "dnf_drivers": [DRIVERS[14], DRIVERS[17]],
            "fastest_lap": DRIVERS[2],
            "first_corner_leader": DRIVERS[0],
        },
    }


def _perfect_prediction(results: dict) -> dict:
    """A prediction that matches results exactly."""
    return {
        "quali_pole": results["quali_pole"],
        "quali_top10": list(results["quali_top10"]),
        "race_winner": results["race_winner"],
        "race_top10": list(results["race_top10"]),
        "bonus_bets": {
            "safety_car": results["bonus"]["safety_car"],
            "dnf_drivers": list(results["bonus"]["dnf_drivers"]),
            "fastest_lap_driver": results["bonus"]["fastest_lap"],
            "first_corner_leader": results["bonus"]["first_corner_leader"],
        },
    }


# ── Core scoring tests ──────────────────────────────────────────────────────


class TestPerfectPrediction:
    """A player who guesses everything correctly should get max points."""

    def test_perfect_score_total(self):
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)

        # quali_pole=5, quali_top10=10*3=30, race_winner=10, race_top10=10*3=30,
        # safety_car=3, dnf=2*2=4, fastest_lap=5, first_corner=3
        expected = 5 + 30 + 10 + 30 + 3 + 4 + 5 + 3
        assert pts["total"] == expected

    def test_perfect_pole_points(self):
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)
        assert pts["quali_pole"] == 5

    def test_perfect_winner_points(self):
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)
        assert pts["race_winner"] == 10

    def test_perfect_xp_earned(self):
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)
        # correct_pole=5, correct_winner=10, bonus_correct=3 each (safety, fastest, first_corner)
        assert pts["xp_earned"] == 5 + 10 + 3 + 3 + 3

    def test_details_populated(self):
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)
        assert len(pts["details"]) > 0
        assert any("Pole" in d for d in pts["details"])
        assert any("Vainqueur" in d for d in pts["details"])


class TestZeroMatch:
    """A player who gets nothing right should score 0."""

    def test_completely_wrong(self):
        results = _full_results()
        pred = {
            "quali_pole": DRIVERS[19],
            "quali_top10": list(reversed(DRIVERS[10:20])),
            "race_winner": DRIVERS[19],
            "race_top10": list(reversed(DRIVERS[10:20])),
            "bonus_bets": {
                "safety_car": False,  # results say True
                "dnf_drivers": [DRIVERS[0], DRIVERS[1]],  # wrong drivers
                "fastest_lap_driver": DRIVERS[19],
                "first_corner_leader": DRIVERS[19],
            },
        }
        pts = calculate_points(pred, results)
        assert pts["total"] == 0
        assert pts["xp_earned"] == 0

    def test_empty_prediction(self):
        results = _full_results()
        pts = calculate_points({}, results)
        assert pts["total"] == 0


class TestPartialMatch:
    """A player who gets some things right."""

    def test_pole_only(self):
        results = _full_results()
        pred = {"quali_pole": results["quali_pole"]}
        pts = calculate_points(pred, results)
        assert pts["quali_pole"] == 5
        assert pts["race_winner"] == 0
        assert pts["total"] == 5

    def test_winner_only(self):
        results = _full_results()
        pred = {"race_winner": results["race_winner"]}
        pts = calculate_points(pred, results)
        assert pts["race_winner"] == 10
        assert pts["quali_pole"] == 0
        assert pts["total"] == 10

    def test_top10_in_top10_but_wrong_position(self):
        """Driver is in top10 but not at the predicted position -> 1pt each."""
        results = _full_results()
        # Shuffle the top10 so no one is in the right position
        shuffled = list(results["quali_top10"])
        shuffled.insert(0, shuffled.pop())  # rotate by 1
        pred = {"quali_top10": shuffled}
        pts = calculate_points(pred, results)
        # All 10 drivers are in top10 but shifted: 9 get 1pt (wrong pos),
        # 1 might get 3pt if rotation lands it back. Let's check manually.
        # With rotate-by-1: pred[0]=driver_10, actual[0]=driver_1 -> in top10 but wrong pos -> 1pt
        # Actually driver_10 IS in the top10 list, so 1pt.
        # All 10 are in top10 but none in exact position (one rotation) -> 10*1=10
        assert pts["quali_top10"] == 10

    def test_mix_exact_and_in_top10(self):
        """Some drivers at exact position, some just in top10."""
        results = _full_results()
        pred_top10 = list(results["quali_top10"])
        # Swap positions 4 and 5
        pred_top10[4], pred_top10[5] = pred_top10[5], pred_top10[4]
        pred = {"quali_top10": pred_top10}
        pts = calculate_points(pred, results)
        # 8 exact (3 pts each) + 2 in top10 but wrong pos (1 pt each) = 26
        assert pts["quali_top10"] == 8 * 3 + 2 * 1


class TestBonusBets:
    """Test individual bonus bet scoring."""

    def test_safety_car_correct(self):
        results = _full_results()
        pred = {"bonus_bets": {"safety_car": True}}
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 3

    def test_safety_car_wrong(self):
        results = _full_results()
        pred = {"bonus_bets": {"safety_car": False}}  # results say True
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 0

    def test_safety_car_none_does_not_award(self):
        """Missing safety_car in prediction should not match missing in results."""
        results = _full_results()
        results["bonus"]["safety_car"] = None
        pred = {"bonus_bets": {}}  # no safety_car key
        pts = calculate_points(pred, results)
        # None == None would give false positive, but guard prevents it
        assert pts["bonus"] == 0

    def test_dnf_one_correct(self):
        results = _full_results()
        pred = {"bonus_bets": {"dnf_drivers": [DRIVERS[14]]}}  # 1 of 2 correct
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 2  # 1 correct DNF * 2pts

    def test_dnf_both_correct(self):
        results = _full_results()
        pred = {"bonus_bets": {"dnf_drivers": [DRIVERS[14], DRIVERS[17]]}}
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 4  # 2 correct DNFs * 2pts

    def test_fastest_lap_correct(self):
        results = _full_results()
        pred = {"bonus_bets": {"fastest_lap_driver": DRIVERS[2]}}
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 5

    def test_first_corner_leader_correct(self):
        results = _full_results()
        pred = {"bonus_bets": {"first_corner_leader": DRIVERS[0]}}
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 3


class TestSprintWeekend:
    """Test scoring for sprint weekends."""

    def test_sprint_quali_top10_exact(self):
        results = _full_results()
        results["sprint_quali_top10"] = DRIVERS[:10]
        pred = {"sprint_quali_top10": DRIVERS[:10]}
        pts = calculate_points(pred, results)
        assert pts["sprint_quali_top10"] == 30  # 10 * 3pts exact

    def test_sprint_race_top10_partial(self):
        results = _full_results()
        results["sprint_race_top10"] = DRIVERS[:10]
        # Predict with 2 swaps
        pred_sprint = list(DRIVERS[:10])
        pred_sprint[0], pred_sprint[1] = pred_sprint[1], pred_sprint[0]
        pred = {"sprint_race_top10": pred_sprint}
        pts = calculate_points(pred, results)
        assert pts["sprint_race_top10"] == 8 * 3 + 2 * 1  # 8 exact + 2 in-top10

    def test_sprint_fields_none_does_not_crash(self):
        """Sprint fields can be None for non-sprint weekends."""
        results = _full_results()
        pred = {"sprint_quali_top10": None, "sprint_race_top10": None}
        pts = calculate_points(pred, results)
        assert pts["sprint_quali_top10"] == 0
        assert pts["sprint_race_top10"] == 0


class TestEdgeCases:
    """Edge cases and robustness."""

    def test_missing_bonus_in_results(self):
        results = _full_results()
        results["bonus"] = {}
        pred = {"bonus_bets": {"safety_car": True}}
        pts = calculate_points(pred, results)
        # safety_car None != True -> 0
        assert pts["bonus"] == 0

    def test_none_bonus_bets(self):
        results = _full_results()
        pred = {"bonus_bets": None}
        pts = calculate_points(pred, results)
        assert pts["bonus"] == 0

    def test_partial_top10_prediction(self):
        """Predict only 5 drivers in top10 instead of 10."""
        results = _full_results()
        pred = {"quali_top10": results["quali_top10"][:5]}
        pts = calculate_points(pred, results)
        assert pts["quali_top10"] == 5 * 3  # 5 exact positions

    def test_total_is_sum_of_components(self):
        """Total should always equal sum of all component scores."""
        results = _full_results()
        pred = _perfect_prediction(results)
        pts = calculate_points(pred, results)
        component_sum = (
            pts["quali_pole"]
            + pts["quali_top10"]
            + pts["sprint_quali_top10"]
            + pts["sprint_race_top10"]
            + pts["race_winner"]
            + pts["race_top10"]
            + pts["bonus"]
        )
        assert pts["total"] == component_sum
