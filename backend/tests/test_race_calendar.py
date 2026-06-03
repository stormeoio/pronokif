from datetime import UTC, datetime

from services.race_calendar import (
    active_2026_races,
    predictions_close_at_utc,
    race_end_at_utc,
    race_start_at_utc,
    race_temporal_status,
    race_with_circuit_timezone,
)


def _austin_test_race() -> dict:
    return {
        "id": "test-austin",
        "date": "2026-10-25",
        "race_time": "14:00",
        "quali_date": "2026-10-24",
        "quali_time": "17:00",
        "timezone": "America/Chicago",
        "race_duration_minutes": 90,
    }


def test_race_start_and_end_use_circuit_timezone() -> None:
    race = _austin_test_race()

    assert race_start_at_utc(race) == datetime(2026, 10, 25, 19, 0, tzinfo=UTC)
    assert race_end_at_utc(race) == datetime(2026, 10, 25, 20, 30, tzinfo=UTC)


def test_predictions_close_at_race_start() -> None:
    # Predictions stay open until the race starts (lights out), then lock.
    assert predictions_close_at_utc(_austin_test_race()) == race_start_at_utc(
        _austin_test_race()
    )
    assert predictions_close_at_utc(_austin_test_race()) == datetime(
        2026,
        10,
        25,
        19,
        0,
        tzinfo=UTC,
    )


def test_temporal_status_changes_during_configured_duration() -> None:
    race = _austin_test_race()

    assert race_temporal_status(race, now=datetime(2026, 10, 25, 18, 59, tzinfo=UTC)) == "upcoming"
    assert race_temporal_status(race, now=datetime(2026, 10, 25, 19, 30, tzinfo=UTC)) == "in_progress"
    assert race_temporal_status(race, now=datetime(2026, 10, 25, 20, 31, tzinfo=UTC)) == "finished"


def test_future_race_is_not_finished_when_stale_results_exist() -> None:
    race = _austin_test_race()

    assert (
        race_temporal_status(
            race,
            now=datetime(2026, 10, 25, 18, 59, tzinfo=UTC),
            has_results=True,
        )
        == "upcoming"
    )


def test_legacy_paris_calendar_is_converted_to_circuit_local_time() -> None:
    race = {
        "id": "austin-2026",
        "name": "US Grand Prix",
        "circuit": "COTA",
        "country": "USA",
        "date": "2026-10-25",
        "race_time": "21:00",
        "quali_date": "2026-10-24",
        "quali_time": "23:00",
        "timezone": "Europe/Paris",
    }

    normalized = race_with_circuit_timezone(race)

    assert normalized["timezone"] == "America/Chicago"
    assert normalized["race_time"] == "15:00"
    assert race_start_at_utc(normalized) == datetime(2026, 10, 25, 20, 0, tzinfo=UTC)


def test_active_calendar_applies_2026_dates_before_timezone_conversion() -> None:
    austin = next(race for race in active_2026_races() if race["id"] == "austin-2026")

    assert austin["date"] == "2026-10-25"
    assert austin["timezone"] == "America/Chicago"
    assert austin["race_time"] == "15:00"
    assert race_start_at_utc(austin) == datetime(2026, 10, 25, 20, 0, tzinfo=UTC)
