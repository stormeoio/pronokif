"""
Unit tests for sync service helper functions (services/sync.py).

Tests the pure/deterministic helpers that don't need external API calls:
- _find_race
- _number_to_id_map
- _extract_driver_ids
- _build_success_items
"""

import pytest

from services.sync import (
    RaceNotFoundError,
    _build_success_items,
    _extract_driver_ids,
    _find_race,
    _number_to_id_map,
)


# ── _find_race ───────────────────────────────────────────────────────────────


class TestFindRace:
    def test_valid_race_id(self):
        from data.f1_data import F1_RACES_2026

        if not F1_RACES_2026:
            pytest.skip("No races in calendar")
        race = _find_race(F1_RACES_2026[0]["id"])
        assert race["id"] == F1_RACES_2026[0]["id"]

    def test_invalid_race_id_raises(self):
        with pytest.raises(RaceNotFoundError):
            _find_race("nonexistent_race_999")


# ── _number_to_id_map ───────────────────────────────────────────────────────


class TestNumberToIdMap:
    def test_returns_dict(self):
        mapping = _number_to_id_map()
        assert isinstance(mapping, dict)
        assert len(mapping) > 0

    def test_keys_are_ints(self):
        mapping = _number_to_id_map()
        for key in mapping:
            assert isinstance(key, int)

    def test_values_are_strings(self):
        mapping = _number_to_id_map()
        for val in mapping.values():
            assert isinstance(val, str)


# ── _extract_driver_ids ─────────────────────────────────────────────────────


class TestExtractDriverIds:
    def test_basic_extraction(self):
        number_to_id = {1: "verstappen", 44: "hamilton", 16: "leclerc"}
        results = [
            {"Driver": {"permanentNumber": "1"}},
            {"Driver": {"permanentNumber": "44"}},
            {"Driver": {"permanentNumber": "16"}},
        ]
        ids = _extract_driver_ids(results, number_to_id)
        assert ids == ["verstappen", "hamilton", "leclerc"]

    def test_limit(self):
        number_to_id = {1: "d1", 2: "d2", 3: "d3"}
        results = [
            {"Driver": {"permanentNumber": "1"}},
            {"Driver": {"permanentNumber": "2"}},
            {"Driver": {"permanentNumber": "3"}},
        ]
        ids = _extract_driver_ids(results, number_to_id, limit=2)
        assert len(ids) == 2
        assert ids == ["d1", "d2"]

    def test_unknown_number_skipped(self):
        number_to_id = {1: "d1"}
        results = [
            {"Driver": {"permanentNumber": "1"}},
            {"Driver": {"permanentNumber": "99"}},  # not in map
        ]
        ids = _extract_driver_ids(results, number_to_id)
        assert ids == ["d1"]

    def test_missing_permanent_number(self):
        number_to_id = {1: "d1"}
        results = [
            {"Driver": {}},  # no permanentNumber
            {"Driver": {"permanentNumber": "1"}},
        ]
        ids = _extract_driver_ids(results, number_to_id)
        assert ids == ["d1"]

    def test_empty_results(self):
        ids = _extract_driver_ids([], {})
        assert ids == []


# ── _build_success_items ─────────────────────────────────────────────────────


class TestBuildSuccessItems:
    def test_full_data(self):
        data = {
            "quali_pole": "verstappen",
            "quali_top10": ["d1"] * 10,
            "race_winner": "hamilton",
            "race_top10": ["d1"] * 10,
            "sprint_race_winner": "leclerc",
            "bonus": {
                "fastest_lap": "norris",
                "safety_car": True,
                "dnf_drivers": ["d5", "d8"],
                "first_corner_leader": "verstappen",
            },
        }
        items = _build_success_items(data)
        assert "Pole position" in items
        assert "Top 10 qualifs" in items
        assert "Vainqueur course" in items
        assert "Top 10 course" in items
        assert "Meilleur tour" in items
        assert "Leader 1er virage" in items
        assert "Vainqueur sprint" in items
        assert any("Safety Car" in i for i in items)
        assert any("DNF" in i for i in items)

    def test_empty_data(self):
        data = {
            "quali_pole": None,
            "quali_top10": [],
            "race_winner": None,
            "race_top10": [],
            "bonus": {
                "fastest_lap": None,
                "safety_car": None,
                "dnf_drivers": [],
                "first_corner_leader": None,
            },
        }
        items = _build_success_items(data)
        assert items == []

    def test_safety_car_false_still_reported(self):
        """safety_car=False is a valid data point (not None)."""
        data = {
            "bonus": {"safety_car": False},
        }
        items = _build_success_items(data)
        assert any("NON" in i for i in items)

    def test_partial_data(self):
        data = {
            "quali_pole": "verstappen",
            "race_winner": None,
            "bonus": {},
        }
        items = _build_success_items(data)
        assert "Pole position" in items
        assert len(items) == 1
