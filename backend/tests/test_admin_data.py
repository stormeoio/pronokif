import pytest
from fastapi import HTTPException

from routes import admin_data as admin_data_routes
from services.race_calendar import active_2026_races


class FakeUsersCollection:
    def __init__(self, user: dict | None) -> None:
        self.user = user
        self.deleted = False

    async def find_one(self, query: dict) -> dict | None:
        return self.user

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


def test_is_protected_admin_user_matches_whitelist_case_insensitively(monkeypatch):
    monkeypatch.setattr(admin_data_routes, "ADMIN_EMAILS", ["fred@stormeo.io"])

    assert admin_data_routes._is_protected_admin_user({"email": " Fred@Stormeo.io "}) is True
    assert admin_data_routes._is_protected_admin_user({"email": "pilot@example.com"}) is False


def test_race_doc_from_static_preserves_timezone_normalized_dates():
    austin = next(race for race in active_2026_races() if race["id"] == "austin-2026")

    race_doc = admin_data_routes._race_doc_from_static(austin, 19)

    assert race_doc["timezone"] == "America/Chicago"
    assert race_doc["date"] == "2026-10-25"
    assert race_doc["race_time"] == "15:00"
    assert race_doc["quali_date"] == "2026-10-22"
    assert race_doc["quali_time"] == "17:00"


def test_completion_rate_is_capped_for_legacy_predictions():
    assert admin_data_routes._completion_rate(submitted=14, total=13) == 100
    assert admin_data_routes._completion_rate(submitted=0, total=0) == 0


def test_race_editorial_payload_summarizes_cancelled_race():
    payload = admin_data_routes._race_editorial_payload(
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
    payload = admin_data_routes._race_editorial_payload(
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


@pytest.mark.asyncio
async def test_delete_user_rejects_admin_accounts(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "fred@stormeo.io"})
    monkeypatch.setattr(admin_data_routes, "db", fake_db)
    monkeypatch.setattr(admin_data_routes, "ADMIN_EMAILS", ["fred@stormeo.io"])

    with pytest.raises(HTTPException) as exc:
        await admin_data_routes.delete_user("user-1", admin={"email": "fred@stormeo.io"})

    assert exc.value.status_code == 403
    assert fake_db.users.deleted is False
    assert fake_db.predictions.deleted is False
    assert fake_db.notifications.deleted is False


@pytest.mark.asyncio
async def test_delete_user_removes_regular_user_data(monkeypatch):
    fake_db = FakeDb({"id": "user-1", "email": "pilot@example.com"})
    monkeypatch.setattr(admin_data_routes, "db", fake_db)
    monkeypatch.setattr(admin_data_routes, "ADMIN_EMAILS", ["fred@stormeo.io"])

    response = await admin_data_routes.delete_user("user-1", admin={"email": "fred@stormeo.io"})

    assert response == {"message": "User and data deleted"}
    assert fake_db.users.deleted is True
    assert fake_db.predictions.deleted is True
    assert fake_db.notifications.deleted is True
