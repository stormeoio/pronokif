from datetime import UTC, datetime, timedelta

from services.admin_invitations import invitation_registration_error
from services.custom_prediction_scoring import (
    answer_matches_correct,
    score_custom_answer,
)
from services.league_membership import (
    leaderboard_query_for_league,
    league_championship_fields,
)
from services.results import official_score_delta, official_score_payload
from services.scoring_reconciliation import (
    build_reconciliation_rows,
    custom_points_by_league_user,
    official_points_by_user,
    reconciliation_summary,
)


def test_league_championship_fields_default_to_f1_2026():
    fields = league_championship_fields()

    assert fields["championship_id"] == "championship-f1-2026"
    assert fields["championship_ids"] == ["championship-f1-2026"]
    assert fields["season"] == 2026


def test_leaderboard_query_keeps_legacy_rows_visible():
    query = leaderboard_query_for_league({"id": "league-1", "championship_id": "championship-f1-2026"})

    assert query["league_id"] == "league-1"
    assert {"championship_id": "championship-f1-2026"} in query["$or"]
    assert {"championship_id": {"$exists": False}} in query["$or"]


def test_custom_prediction_answer_matching_is_normalized_and_multiple_choice_aware():
    assert answer_matches_correct(" Verstappen ", "verstappen")
    assert answer_matches_correct(["NOR", "PIA"], ["VER", "PIA"], multiple_choice=True)
    assert not answer_matches_correct(["NOR"], ["VER", "PIA"], multiple_choice=True)


def test_score_custom_answer_returns_points_and_xp_only_when_correct():
    correct = score_custom_answer({"answer": "Oui"}, correct_answer="oui")
    wrong = score_custom_answer({"answer": "Non"}, correct_answer="oui")

    assert correct == {"is_correct": True, "points_awarded": 2, "xp_awarded": 10}
    assert wrong == {"is_correct": False, "points_awarded": 0, "xp_awarded": 0}


def test_invitation_registration_error_validates_status_and_email():
    now = datetime(2026, 1, 1, tzinfo=UTC)
    pending = {
        "email": "pilot@example.com",
        "accepted": False,
        "expires_at": (now + timedelta(days=1)).isoformat(),
    }

    assert invitation_registration_error(pending, email="pilot@example.com", now=now) is None
    assert invitation_registration_error(None, email="pilot@example.com", now=now) == "Invitation introuvable"
    assert (
        invitation_registration_error({**pending, "email": "other@example.com"}, email="pilot@example.com", now=now)
        == "Cette invitation est associée à un autre email"
    )
    assert invitation_registration_error({**pending, "accepted": True}, email="pilot@example.com", now=now) == (
        "Invitation déjà acceptée"
    )
    assert invitation_registration_error(
        {**pending, "expires_at": (now - timedelta(seconds=1)).isoformat()},
        email="pilot@example.com",
        now=now,
    ) == "Invitation expirée"


def test_official_score_payload_is_canonical_and_delta_based():
    score = official_score_payload(
        prediction={"id": "pred-1", "user_id": "user-1"},
        race_id="australia-2026",
        points={
            "total": 42,
            "xp_earned": 11,
            "quali_pole": 5,
            "quali_top10": 10,
            "sprint_quali_top10": 0,
            "sprint_race_top10": 0,
            "race_winner": 10,
            "race_top10": 14,
            "bonus": 3,
            "details": ["Pole exacte"],
        },
        championship_context={"championship_id": "championship-f1-2026", "season": 2026},
        scored_at="2026-03-08T10:00:00+00:00",
        scored_by="admin-1",
    )

    assert score["score_type"] == "official_race"
    assert score["prediction_id"] == "pred-1"
    assert score["points_total"] == 42
    assert score["xp_awarded"] == 11
    assert score["breakdown"]["race_winner"] == 10
    assert score["championship_id"] == "championship-f1-2026"

    assert official_score_delta({"points_total": 40, "xp_awarded": 15}, score) == {
        "points_delta": 2,
        "xp_delta": -4,
    }
    assert official_score_delta(None, score) == {"points_delta": 42, "xp_delta": 11}


def test_reconciliation_aggregates_official_and_custom_points_by_league():
    official_totals = official_points_by_user(
        [
            {"score_type": "official_race", "user_id": "user-1", "points_total": 40},
            {"score_type": "official_race", "user_id": "user-1", "points_total": 2},
            {"score_type": "official_race", "user_id": "user-2", "points_total": 11},
            {"score_type": "custom", "user_id": "user-1", "points_total": 999},
        ]
    )
    custom_totals = custom_points_by_league_user(
        [{"id": "custom-1", "league_id": "league-1"}],
        [
            {"prediction_id": "custom-1", "user_id": "user-1", "points_awarded": 2},
            {"league_id": "league-2", "prediction_id": "custom-2", "user_id": "user-1", "points_awarded": 2},
        ],
    )

    rows = build_reconciliation_rows(
        league={"id": "league-1", "members": ["user-1", "user-2"]},
        current_entries=[
            {"id": "entry-1", "user_id": "user-1", "total_points": 40},
        ],
        official_totals=official_totals,
        custom_totals=custom_totals,
    )

    assert rows[0]["expected_total"] == 44
    assert rows[0]["delta"] == 4
    assert rows[0]["official_points"] == 42
    assert rows[0]["custom_points"] == 2
    assert rows[1]["expected_total"] == 11
    assert rows[1]["has_entry"] is False

    summary = reconciliation_summary(rows)
    assert summary["mismatches"] == 2
    assert summary["missing_entries"] == 1
    assert summary["positive_delta"] == 15
