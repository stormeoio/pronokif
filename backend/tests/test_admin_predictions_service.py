from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from services import admin_predictions


def test_prediction_batch_update_payload_builds_lock_update(monkeypatch):
    monkeypatch.setattr(admin_predictions, "_now_iso", lambda: "2026-05-29T10:00:00+00:00")
    request = SimpleNamespace(
        action="lock",
        reason="deadline",
        review_status=None,
    )

    payload = admin_predictions.prediction_batch_update_payload(
        request,
        {"email": "admin@pronokif.eu"},
    )

    assert payload["locked"] is True
    assert payload["locked_by"] == "admin@pronokif.eu"
    assert payload["lock_reason"] == "deadline"
    assert payload["updated_at"] == "2026-05-29T10:00:00+00:00"


def test_prediction_batch_update_payload_requires_review_status():
    request = SimpleNamespace(
        action="set_review_status",
        reason=None,
        review_status=None,
    )

    with pytest.raises(HTTPException) as exc:
        admin_predictions.prediction_batch_update_payload(request, {"email": "admin@pronokif.eu"})

    assert exc.value.status_code == 400


def test_score_ledger_row_normalizes_official_and_custom_scores():
    official = admin_predictions.score_ledger_row(
        {
            "id": "score-1",
            "score_type": "official_race",
            "prediction_id": "prediction-1",
            "race_id": "australia-2026",
            "user_id": "user-1",
            "points_total": 42,
            "xp_awarded": 20,
            "details": ["Pole exacte"],
            "scored_at": "2026-03-08T10:00:00+00:00",
        },
        source="official_race",
        users_by_id={"user-1": {"id": "user-1", "email": "pilot@example.com", "username": "Pilot"}},
        races_by_id={"australia-2026": {"id": "australia-2026", "name": "Grand Prix d'Australie"}},
        leagues_by_id={},
        custom_predictions_by_id={},
    )
    custom = admin_predictions.score_ledger_row(
        {
            "prediction_id": "custom-1",
            "league_id": "league-1",
            "race_id": "australia-2026",
            "user_id": "user-1",
            "points_awarded": 2,
            "xp_awarded": 10,
            "is_correct": True,
            "answer": "Oui",
        },
        source="custom_prediction",
        users_by_id={"user-1": {"id": "user-1", "email": "pilot@example.com", "username": "Pilot"}},
        races_by_id={"australia-2026": {"id": "australia-2026", "name": "Grand Prix d'Australie"}},
        leagues_by_id={"league-1": {"id": "league-1", "name": "Paddock"}},
        custom_predictions_by_id={"custom-1": {"id": "custom-1", "question": "Safety car ?", "correct_answer": "Oui"}},
    )

    assert official["source"] == "official_race"
    assert official["title"] == "Grand Prix d'Australie"
    assert custom["source"] == "custom_prediction"
    assert custom["title"] == "Safety car ?"

    summary = admin_predictions.score_ledger_summary([official, custom])
    assert summary["total_rows"] == 2
    assert summary["official_rows"] == 1
    assert summary["custom_rows"] == 1
    assert summary["points_total"] == 44
