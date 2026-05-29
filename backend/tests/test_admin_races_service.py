import pytest
from fastapi import HTTPException

from services import admin_races
from services.race_calendar import active_2026_races


class Payload:
    def __init__(self, values: dict) -> None:
        self.values = values
        for key, value in values.items():
            setattr(self, key, value)

    def model_dump(self) -> dict:
        return self.values


def test_race_doc_from_static_preserves_championship_and_normalized_dates():
    austin = next(race for race in active_2026_races() if race["id"] == "austin-2026")

    race_doc = admin_races.race_doc_from_static(austin, 19)

    assert race_doc["championship_id"] == "championship-f1-2026"
    assert race_doc["championship_ids"] == ["championship-f1-2026"]
    assert race_doc["timezone"] == "America/Chicago"
    assert race_doc["date"] == "2026-10-25"
    assert race_doc["race_time"] == "15:00"
    assert race_doc["quali_date"] == "2026-10-22"
    assert race_doc["quali_time"] == "17:00"


def test_race_editorial_payload_uses_result_digest_and_completion():
    payload = admin_races.race_editorial_payload(
        {
            "id": "australia-2026",
            "name": "Grand Prix d'Australie",
            "circuit": "Albert Park",
            "country": "Australie",
            "is_cancelled": False,
            "is_sprint": False,
            "date": "2026-03-08",
            "race_time": "15:00",
            "timezone": "Australia/Melbourne",
        },
        {
            "entered_at": "2026-03-08T08:00:00+00:00",
            "results": {
                "quali_pole": "VER",
                "quali_top10": ["VER", "NOR", "LEC"],
                "race_winner": "NOR",
                "race_top10": ["NOR", "VER", "LEC"],
                "bonus": {"safety_car": True, "dnf_drivers": ["HAM"], "fastest_lap": "PIA"},
            },
        },
        submitted=9,
        missing=1,
        total_users=10,
    )

    assert payload["content_status"] == "published"
    assert payload["results_digest"]["race_winner"]
    assert payload["prediction_digest"]["completion_rate"] == 90
    assert "9/10" in payload["public_recap"]


def test_scoring_coverage_payload_flags_gaps_only_after_results():
    payload = admin_races.scoring_coverage_payload(submitted=10, scored=7, has_results=True)

    assert payload["scored_predictions"] == 7
    assert payload["scoring_pending"] == 3
    assert payload["scoring_coverage_rate"] == 70
    assert payload["has_scoring_gaps"] is True

    no_results = admin_races.scoring_coverage_payload(submitted=10, scored=0, has_results=False)
    assert no_results["scoring_pending"] == 0
    assert no_results["has_scoring_gaps"] is False


def test_race_create_doc_applies_defaults_and_timing_context():
    doc = admin_races.race_create_doc(
        Payload(
            {
                "name": "Test GP",
                "circuit": "Test Circuit",
                "country": "France",
                "date": "2026-06-01",
                "season": 2026,
                "championship_id": None,
                "timezone": None,
                "race_time": None,
                "quali_time": None,
                "race_duration_minutes": 120,
            }
        ),
        now="2026-05-29T10:00:00+00:00",
        actor_email="admin@pronokif.eu",
        race_id="race-test",
    )

    assert doc["id"] == "race-test"
    assert doc["championship_id"] == "championship-f1-2026"
    assert doc["championship_ids"] == ["championship-f1-2026"]
    assert doc["timezone"] == "Europe/Paris"
    assert doc["race_time"] == "15:00"
    assert doc["created_by"] == "admin@pronokif.eu"
    assert "race_start_at" in doc


def test_race_update_payload_backfills_championship_from_season_and_requires_fields():
    payload = admin_races.race_update_payload(
        Payload({"season": 2026, "name": None}),
        now="2026-05-29T10:00:00+00:00",
        actor_email="admin@pronokif.eu",
    )

    assert payload["championship_id"] == "championship-f1-2026"
    assert payload["championship_ids"] == ["championship-f1-2026"]
    assert payload["updated_by"] == "admin@pronokif.eu"

    with pytest.raises(HTTPException) as exc:
        admin_races.race_update_payload(
            Payload({"name": None}),
            now="2026-05-29T10:00:00+00:00",
            actor_email="admin@pronokif.eu",
        )

    assert exc.value.status_code == 400
