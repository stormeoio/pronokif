from datetime import UTC, datetime

from services.sync_background import (
    _has_complete_results,
    _race_start_at_utc,
    _race_sync_window,
    _should_attempt_result_sync,
)


def _monaco_race() -> dict:
    return {
        "id": "monaco-2026",
        "name": "Monaco Grand Prix",
        "date": "2026-05-24",
        "race_time": "15:00",
        "timezone": "Europe/Paris",
    }


def test_race_start_uses_calendar_timezone() -> None:
    race_start = _race_start_at_utc(_monaco_race())

    assert race_start == datetime(2026, 5, 24, 13, 0, tzinfo=UTC)


def test_race_sync_window_starts_one_hour_before_race() -> None:
    window_start, window_end = _race_sync_window(_monaco_race())

    assert window_start == datetime(2026, 5, 24, 12, 0, tzinfo=UTC)
    assert window_end == datetime(2026, 5, 25, 1, 0, tzinfo=UTC)


def test_should_attempt_sync_when_race_window_has_opened() -> None:
    now = datetime(2026, 5, 24, 12, 5, tzinfo=UTC)

    assert _should_attempt_result_sync(_monaco_race(), now, None) is True


def test_should_not_attempt_sync_before_race_window() -> None:
    now = datetime(2026, 5, 24, 11, 59, tzinfo=UTC)

    assert _should_attempt_result_sync(_monaco_race(), now, None) is False


def test_should_not_attempt_sync_when_results_complete() -> None:
    now = datetime(2026, 5, 24, 12, 5, tzinfo=UTC)
    result_doc = {
        "results": {
            "race_winner": "leclerc",
            "race_top10": ["leclerc", "norris"],
        }
    }

    assert _has_complete_results(result_doc) is True
    assert _should_attempt_result_sync(_monaco_race(), now, result_doc) is False
