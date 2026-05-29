import pytest
from fastapi import HTTPException

from services import admin_championships


class Payload:
    def __init__(self, values: dict) -> None:
        self.values = values

    def model_dump(self) -> dict:
        return self.values


class FakeCursor:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows

    def sort(self, *args) -> "FakeCursor":
        return self

    async def to_list(self, limit: int) -> list[dict]:
        return self.rows[:limit]


class FakeRaceCollection:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows

    def find(self, query: dict, projection: dict) -> FakeCursor:
        assert query == {"championship_id": "championship-f1-2026"}
        return FakeCursor(self.rows)


class FakeCountCollection:
    def __init__(self, count: int) -> None:
        self.count = count
        self.queries: list[dict] = []

    async def count_documents(self, query: dict) -> int:
        self.queries.append(query)
        return self.count


class FakeDb:
    def __init__(self) -> None:
        self.races = FakeRaceCollection(
            [
                {"id": "australia-2026", "name": "Australian GP", "is_cancelled": False},
                {"id": "bahrain-2026", "name": "Bahrain GP", "is_cancelled": True},
            ]
        )
        self.predictions = FakeCountCollection(12)
        self.race_results = FakeCountCollection(2)
        self.custom_predictions = FakeCountCollection(4)
        self.minigame_results = FakeCountCollection(6)
        self.leaderboard = FakeCountCollection(8)


def test_championship_create_doc_keeps_translation_fields_and_actor():
    doc = admin_championships.championship_create_doc(
        Payload(
            {
                "name": "Formula 1 2026",
                "season": 2026,
                "name_translations": {"fr": "Formule 1 2026", "en": "Formula 1 2026"},
            }
        ),
        now="2026-05-29T10:00:00+00:00",
        actor_email="admin@pronokif.eu",
        championship_id="championship-f1-2026",
    )

    assert doc["id"] == "championship-f1-2026"
    assert doc["created_by"] == "admin@pronokif.eu"
    assert doc["name_translations"]["fr"] == "Formule 1 2026"
    assert doc["updated_at"] == "2026-05-29T10:00:00+00:00"


def test_championship_update_payload_ignores_none_and_requires_fields():
    payload = admin_championships.championship_update_payload(
        Payload({"name": "F1 2026", "description": None}),
        now="2026-05-29T10:00:00+00:00",
        actor_email="admin@pronokif.eu",
    )

    assert payload == {
        "name": "F1 2026",
        "updated_at": "2026-05-29T10:00:00+00:00",
        "updated_by": "admin@pronokif.eu",
    }

    with pytest.raises(HTTPException) as exc:
        admin_championships.championship_update_payload(
            Payload({"name": None}),
            now="2026-05-29T10:00:00+00:00",
            actor_email="admin@pronokif.eu",
        )

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_championship_with_counts_uses_linked_entities_and_race_status(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr(admin_championships, "db", fake_db)

    payload = await admin_championships.championship_with_counts(
        {"id": "championship-f1-2026", "name": "Formula 1 2026"}
    )

    assert payload["race_ids"] == ["australia-2026", "bahrain-2026"]
    assert payload["races_count"] == 2
    assert payload["active_races_count"] == 1
    assert payload["cancelled_races_count"] == 1
    assert payload["linked_counts"] == {
        "races": 2,
        "predictions": 12,
        "race_results": 2,
        "custom_predictions": 4,
        "minigame_results": 6,
        "leaderboard_entries": 8,
    }
    assert fake_db.predictions.queries[0]["$or"][0] == {"championship_id": "championship-f1-2026"}
