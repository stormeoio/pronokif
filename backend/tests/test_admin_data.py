import pytest
from fastapi import HTTPException

from routes import admin_predictions as admin_predictions_routes
from routes import admin_users as admin_users_routes
from services import admin_activity as admin_activity_service
from services import admin_csv as admin_csv_service
from services import admin_feedbacks as admin_feedbacks_service
from services import admin_leagues as admin_leagues_service
from services import admin_predictions as admin_predictions_service
from services import admin_races as admin_races_service
from services import admin_users as admin_users_service
from services.race_calendar import active_2026_races


class FakeUsersCollection:
    def __init__(self, user: dict | None) -> None:
        self.user = user
        self.deleted = False
        self.updated: tuple[dict, dict] | None = None

    async def find_one(self, query: dict) -> dict | None:
        return self.user

    async def update_one(self, query: dict, update: dict):
        self.updated = (query, update)
        return type("Result", (), {"matched_count": 1 if self.user else 0})()

    async def delete_one(self, query: dict) -> None:
        self.deleted = True


class FakeDeleteManyCollection:
    def __init__(self) -> None:
        self.deleted = False

    async def delete_many(self, query: dict) -> None:
        self.deleted = True


class FakeDb:
    def __init__(self, user: dict | None) -> None:
        self.users = FakeUsersCollection(user)
        self.predictions = FakeDeleteManyCollection()
        self.notifications = FakeDeleteManyCollection()


def test_is_protected_admin_user_matches_whitelist_case_insensitively():
    assert admin_users_service.is_protected_admin_user(
        {"email": " Fred@Stormeo.io "}, ["fred@stormeo.io"]
    ) is True
    assert admin_users_service.is_protected_admin_user(
        {"email": "pilot@example.com"}, ["fred@stormeo.io"]
    ) is False


def test_race_doc_from_static_preserves_timezone_normalized_dates():
    austin = next(race for race in active_2026_races() if race["id"] == "austin-2026")

    race_doc = admin_races_service.race_doc_from_static(austin, 19)

    assert race_doc["championship_id"] == "championship-f1-2026"
    assert race_doc["championship_ids"] == ["championship-f1-2026"]
    assert race_doc["timezone"] == "America/Chicago"
    assert race_doc["date"] == "2026-10-25"
    assert race_doc["race_time"] == "15:00"
    assert race_doc["quali_date"] == "2026-10-22"
    assert race_doc["quali_time"] == "17:00"


def test_completion_rate_is_capped_for_legacy_predictions():
    assert admin_races_service.completion_rate(submitted=14, total=13) == 100
    assert admin_races_service.completion_rate(submitted=0, total=0) == 0


def test_scoring_coverage_payload_flags_scoring_gaps_only_after_results():
    payload = admin_races_service.scoring_coverage_payload(
        submitted=10,
        scored=7,
        has_results=True,
    )

    assert payload["scored_predictions"] == 7
    assert payload["scoring_pending"] == 3
    assert payload["scoring_coverage_rate"] == 70
    assert payload["has_scoring_gaps"] is True

    no_results = admin_races_service.scoring_coverage_payload(
        submitted=10,
        scored=0,
        has_results=False,
    )
    assert no_results["scoring_pending"] == 0
    assert no_results["has_scoring_gaps"] is False


def test_race_editorial_payload_summarizes_cancelled_race():
    payload = admin_races_service.race_editorial_payload(
        {
            "id": "bahrain-2026",
            "name": "Bahrain Grand Prix",
            "circuit": "Sakhir",
            "country": "Bahrain",
            "is_cancelled": True,
            "is_sprint": False,
        },
        None,
    )

    assert payload["cancellation_reason"] == "Official reason to specify in the back office."
    assert payload["results_digest"] is None
    assert "scoring" in payload["admin_summary"].lower()
    assert payload["user_content_idea"]


def test_race_editorial_payload_uses_result_digest():
    payload = admin_races_service.race_editorial_payload(
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


def test_prediction_admin_payload_marks_missing_fields_and_context():
    payload = admin_predictions_service.prediction_admin_payload(
        {
            "id": "prediction-1",
            "user_id": "user-1",
            "race_id": "race-1",
            "created_at": "2026-03-07T10:00:00+00:00",
            "main_updated_at": "2026-03-07T18:00:00+00:00",
            "quali_pole": "VER",
            "quali_top10": ["VER"],
            "race_winner": "NOR",
            "race_top10": [],
        },
        user={"id": "user-1", "email": "pilot@example.com", "username": "Pilot"},
        race={"id": "race-1", "name": "Test GP", "is_sprint": False, "date": "2026-03-08"},
    )

    assert payload["user_email"] == "pilot@example.com"
    assert payload["race_name"] == "Test GP"
    assert payload["submitted_at"] == "2026-03-07T18:00:00+00:00"
    assert payload["is_complete"] is False
    assert "Top 10 qualifications" in payload["missing_fields"]
    assert "Top 10 course" in payload["missing_fields"]


def test_user_prediction_stats_from_payloads_summarizes_scored_predictions():
    stats = admin_predictions_service.user_prediction_stats_from_payloads(
        [
            {
                "id": "prediction-1",
                "race_id": "australia-2026",
                "race_name": "Grand Prix d'Australie",
                "is_complete": True,
                "locked": True,
                "score_preview": {"total": 42},
            },
            {
                "id": "prediction-2",
                "race_id": "china-2026",
                "race_name": "Grand Prix de Chine",
                "is_complete": False,
                "locked": False,
                "score_preview": None,
            },
        ]
    )

    assert stats["predictions_count"] == 2
    assert stats["complete_predictions"] == 1
    assert stats["locked_predictions"] == 1
    assert stats["total_points"] == 42
    assert stats["best_race"]["race_id"] == "australia-2026"


def test_user_analytics_from_docs_includes_inactive_and_league_counts():
    analytics = admin_users_service.user_analytics_from_docs(
        [
            {"id": "user-1", "email": "pilot@example.com", "username": "Pilot"},
            {"id": "user-2", "email": "rookie@example.com", "username": "Rookie", "is_banned": True},
        ],
        [
            {
                "id": "prediction-1",
                "user_id": "user-1",
                "is_complete": True,
                "locked": False,
                "score_preview": {"total": 25},
            }
        ],
        [{"id": "league-1", "created_by": "user-1", "members": ["user-1", "user-2"]}],
    )

    assert analytics["summary"]["users_count"] == 2
    assert analytics["summary"]["users_with_predictions"] == 1
    assert analytics["summary"]["users_without_predictions"] == 1
    assert analytics["summary"]["banned_users"] == 1
    assert analytics["top_users"][0]["user_id"] == "user-1"
    assert analytics["top_users"][0]["leagues_count"] == 1
    assert analytics["inactive_users"][0]["user_id"] == "user-2"


def test_recent_user_dashboard_payloads_adds_onboarding_context():
    rows = admin_users_service.recent_user_dashboard_payloads(
        [
            {"id": "user-1", "email": "pilot@example.com", "username": "Pilot"},
            {"id": "user-2", "email": "rookie@example.com", "username": "Rookie"},
        ],
        [
            {
                "id": "prediction-1",
                "user_id": "user-1",
                "created_at": "2026-03-07T10:00:00+00:00",
                "main_updated_at": "2026-03-07T18:00:00+00:00",
            },
            {
                "id": "prediction-2",
                "user_id": "user-1",
                "created_at": "2026-03-08T10:00:00+00:00",
            },
        ],
        [{"id": "league-1", "created_by": "user-1", "members": ["user-1", "user-2"]}],
    )

    assert rows[0]["predictions_count"] == 2
    assert rows[0]["leagues_count"] == 1
    assert rows[0]["last_prediction_at"] == "2026-03-08T10:00:00+00:00"
    assert rows[1]["predictions_count"] == 0
    assert rows[1]["leagues_count"] == 1
    assert rows[1]["last_prediction_at"] is None


def test_users_search_query_matches_username_or_email():
    query = admin_users_service.users_search_query("pilot")

    assert query["$or"][0]["username"]["$regex"] == "pilot"
    assert query["$or"][1]["email"]["$options"] == "i"


def test_prediction_analytics_groups_by_race_and_user():
    analytics = admin_predictions_service.prediction_analytics_from_payloads(
        [
            {
                "id": "prediction-1",
                "user_id": "user-1",
                "user_email": "pilot@example.com",
                "race_id": "australia-2026",
                "race_name": "Grand Prix d'Australie",
                "is_complete": True,
                "locked": True,
                "review_status": "validated",
                "score_preview": {"total": 30},
            },
            {
                "id": "prediction-2",
                "user_id": "user-1",
                "user_email": "pilot@example.com",
                "race_id": "australia-2026",
                "race_name": "Grand Prix d'Australie",
                "is_complete": False,
                "locked": False,
                "review_status": None,
                "score_preview": None,
            },
        ]
    )

    assert analytics["summary"]["total"] == 2
    assert analytics["by_race"][0]["total"] == 2
    assert analytics["by_race"][0]["average_points"] == 30
    assert analytics["top_users"][0]["total_points"] == 30
    assert analytics["review_queue"]["validated"] == 1
    assert analytics["review_queue"]["none"] == 1


def test_score_ledger_row_normalizes_official_and_custom_scores():
    official = admin_predictions_service.score_ledger_row(
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
    custom = admin_predictions_service.score_ledger_row(
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
    assert official["points"] == 42
    assert official["user_email"] == "pilot@example.com"
    assert custom["source"] == "custom_prediction"
    assert custom["title"] == "Safety car ?"
    assert custom["league_name"] == "Paddock"
    assert custom["points"] == 2
    assert custom["is_correct"] is True

    summary = admin_predictions_service.score_ledger_summary([official, custom])
    assert summary["total_rows"] == 2
    assert summary["official_rows"] == 1
    assert summary["custom_rows"] == 1
    assert summary["points_total"] == 44
    assert summary["xp_total"] == 30
    assert summary["custom_correct"] == 1


def test_normalize_score_type_rejects_unknown_values():
    assert admin_predictions_service.normalize_score_type("official_race") == "official_race"

    with pytest.raises(HTTPException):
        admin_predictions_service.normalize_score_type("bonus")


def test_league_admin_payload_enriches_owner_members_and_points():
    payload = admin_leagues_service.league_admin_payload(
        {
            "id": "league-1",
            "name": "Paddock Paris",
            "code": "PK2026",
            "created_by": "user-1",
            "members": ["user-1", "user-2", "user-2"],
        },
        users_by_id={
            "user-1": {"id": "user-1", "email": "owner@example.com", "username": "Owner"},
            "user-2": {"id": "user-2", "email": "rookie@example.com", "username": "Rookie"},
        },
        leaderboard_entries=[
            {"league_id": "league-1", "user_id": "user-1", "total_points": 42, "last_race_points": 8},
            {"league_id": "league-1", "user_id": "user-2", "total_points": 55, "last_race_points": 12},
        ],
        messages_count=7,
    )

    assert payload["members"] == ["user-1", "user-2"]
    assert payload["members_count"] == 2
    assert payload["owner_email"] == "owner@example.com"
    assert payload["messages_count"] == 7
    assert payload["total_points"] == 97
    assert payload["top_members"][0]["user_id"] == "user-2"
    assert payload["member_details"][1]["is_owner"] is True


def test_league_analytics_from_payloads_summarizes_community_health():
    analytics = admin_leagues_service.league_analytics_from_payloads(
        [
            {
                "id": "league-1",
                "name": "Paddock Paris",
                "members_count": 4,
                "messages_count": 9,
                "total_points": 100,
                "review_status": "validated",
            },
            {
                "id": "league-2",
                "name": "Empty Grid",
                "members_count": 0,
                "messages_count": 0,
                "total_points": 0,
                "is_archived": True,
            },
        ]
    )

    assert analytics["summary"]["leagues_count"] == 2
    assert analytics["summary"]["active_leagues"] == 1
    assert analytics["summary"]["empty_leagues"] == 1
    assert analytics["summary"]["average_members"] == 2
    assert analytics["summary"]["total_messages"] == 9
    assert analytics["top_by_members"][0]["id"] == "league-1"
    assert analytics["review_queue"]["validated"] == 1
    assert analytics["review_queue"]["none"] == 1


def test_feedback_query_combines_triage_filters_and_text_search():
    query = admin_feedbacks_service.feedback_query(
        q="sprint",
        category="bug",
        read_status="unread",
        status="new",
        priority="high",
    )

    assert query["category"] == "bug"
    assert query["read"] is False
    assert query["status"] == "new"
    assert query["priority"] == "high"
    assert query["$or"][0]["message"]["$regex"] == "sprint"


def test_feedback_query_filters_beta_ownership():
    mine_query = admin_feedbacks_service.feedback_query(owner="mine", current_admin_email="admin@pronokif.eu")
    unassigned_query = admin_feedbacks_service.feedback_query(q="bug", owner="unassigned")

    assert mine_query["assigned_to"] == "admin@pronokif.eu"
    assert "$and" in unassigned_query
    assert unassigned_query["$and"][0]["$or"][0]["message"]["$regex"] == "bug"
    assert {"assigned_to": ""} in unassigned_query["$and"][1]["$or"]


def test_feedback_analytics_from_docs_groups_triage_state():
    analytics = admin_feedbacks_service.feedback_analytics_from_docs(
        [
            {
                "id": "feedback-1",
                "user_id": "user-1",
                "username": "Pilot",
                "category": "bug",
                "read": False,
                "status": "new",
                "priority": "high",
                "assigned_to": "admin@pronokif.eu",
                "created_at": "2026-05-29T10:00:00+00:00",
            },
            {
                "id": "feedback-2",
                "user_id": "user-1",
                "username": "Pilot",
                "category": "suggestion",
                "read": True,
                "status": "planned",
                "priority": "normal",
                "admin_reply": "Merci, c'est noté.",
                "admin_reply_sent_at": "2026-05-29T11:30:00+00:00",
                "created_at": "2026-05-29T11:00:00+00:00",
            },
        ]
    )

    assert analytics["summary"]["total"] == 2
    assert analytics["summary"]["unread"] == 1
    assert analytics["summary"]["bugs"] == 1
    assert analytics["summary"]["suggestions"] == 1
    assert analytics["summary"]["high_priority"] == 1
    assert analytics["summary"]["open_bugs"] == 1
    assert analytics["summary"]["assigned"] == 1
    assert analytics["summary"]["replied"] == 1
    assert analytics["by_status"]["planned"] == 1
    assert analytics["top_submitters"][0]["feedbacks_count"] == 2


def test_admin_activity_doc_normalizes_actor_and_metadata(monkeypatch):
    monkeypatch.setattr(admin_activity_service, "_now_iso", lambda: "2026-05-29T10:00:00+00:00")

    doc = admin_activity_service.admin_activity_doc(
        {"email": " Admin@PronoKif.eu ", "id": "admin-1"},
        action="prediction.update",
        entity_type="prediction",
        entity_id="prediction-1",
        metadata={"field": "locked"},
    )

    assert doc["actor_email"] == "admin@pronokif.eu"
    assert doc["actor_id"] == "admin-1"
    assert doc["metadata"]["field"] == "locked"
    assert doc["created_at"] == "2026-05-29T10:00:00+00:00"


def test_csv_value_serializes_structured_values():
    assert admin_csv_service.csv_value({"b": 2, "a": 1}) == '{"a": 1, "b": 2}'
    assert admin_csv_service.csv_value(None) == ""


def test_activity_log_query_builds_search_filters():
    query = admin_activity_service.activity_log_query(
        actor_email=" Admin@PronoKif.eu ",
        entity_type="prediction",
        action="prediction.update",
        q="australia",
    )

    assert query["actor_email"] == "admin@pronokif.eu"
    assert query["entity_type"] == "prediction"
    assert query["action"] == "prediction.update"
    assert "$or" in query


def test_prediction_batch_update_payload_builds_lock_update(monkeypatch):
    monkeypatch.setattr(admin_predictions_service, "_now_iso", lambda: "2026-05-29T10:00:00+00:00")
    request = admin_predictions_routes.PredictionBatchActionRequest(
        ids=["prediction-1"],
        action="lock",
        reason="deadline",
    )

    payload = admin_predictions_service.prediction_batch_update_payload(
        request,
        {"email": "admin@pronokif.eu"},
    )

    assert payload["locked"] is True
    assert payload["locked_by"] == "admin@pronokif.eu"
    assert payload["lock_reason"] == "deadline"
    assert payload["updated_at"] == "2026-05-29T10:00:00+00:00"


def test_prediction_batch_update_payload_requires_review_status():
    request = admin_predictions_routes.PredictionBatchActionRequest(
        ids=["prediction-1"],
        action="set_review_status",
    )

    with pytest.raises(HTTPException) as exc:
        admin_predictions_service.prediction_batch_update_payload(request, {"email": "admin@pronokif.eu"})

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_update_user_can_set_media_avatar(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "pilot@example.com"})
    logged: list[dict] = []
    monkeypatch.setattr(admin_users_routes, "db", fake_db)

    async def fake_log_backoffice_activity(admin: dict, **kwargs: dict) -> None:
        logged.append(kwargs)

    monkeypatch.setattr(
        admin_users_routes,
        "log_backoffice_activity",
        fake_log_backoffice_activity,
    )

    response = await admin_users_routes.update_user(
        "user-1",
        admin_users_routes.UserUpdate(
            username="Pilot One",
            custom_avatar_url="/api/admin-bo/media/media-1/file",
        ),
        admin={"email": "admin@pronokif.eu"},
    )

    assert response == {"message": "User updated"}
    assert fake_db.users.updated == (
        {"id": "user-1"},
        {
            "$set": {
                "username": "Pilot One",
                "custom_avatar_url": "/api/admin-bo/media/media-1/file",
                "avatar_id": None,
            }
        },
    )
    assert logged[0]["metadata"]["fields"] == ["avatar_id", "custom_avatar_url", "username"]


@pytest.mark.asyncio
async def test_update_user_can_clear_custom_avatar(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "pilot@example.com"})
    monkeypatch.setattr(admin_users_routes, "db", fake_db)

    async def fake_log_backoffice_activity(admin: dict, **kwargs: dict) -> None:
        return None

    monkeypatch.setattr(
        admin_users_routes,
        "log_backoffice_activity",
        fake_log_backoffice_activity,
    )

    response = await admin_users_routes.update_user(
        "user-1",
        admin_users_routes.UserUpdate(custom_avatar_url=""),
        admin={"email": "admin@pronokif.eu"},
    )

    assert response == {"message": "User updated"}
    assert fake_db.users.updated == (
        {"id": "user-1"},
        {"$set": {"custom_avatar_url": None, "avatar_id": None}},
    )


@pytest.mark.asyncio
async def test_delete_user_rejects_admin_accounts(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "fred@stormeo.io"})
    monkeypatch.setattr(admin_users_routes, "db", fake_db)
    monkeypatch.setattr(admin_users_routes, "ADMIN_EMAILS", ["fred@stormeo.io"])

    with pytest.raises(HTTPException) as exc:
        await admin_users_routes.delete_user("user-1", admin={"email": "fred@stormeo.io"})

    assert exc.value.status_code == 403
    assert fake_db.users.deleted is False
    assert fake_db.predictions.deleted is False
    assert fake_db.notifications.deleted is False


@pytest.mark.asyncio
async def test_delete_user_removes_regular_user_data(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "pilot@example.com"})
    monkeypatch.setattr(admin_users_routes, "db", fake_db)
    monkeypatch.setattr(admin_users_routes, "ADMIN_EMAILS", ["fred@stormeo.io"])

    response = await admin_users_routes.delete_user("user-1", admin={"email": "fred@stormeo.io"})

    assert response == {"message": "User and data deleted"}
    assert fake_db.users.deleted is True
    assert fake_db.predictions.deleted is True
    assert fake_db.notifications.deleted is True
