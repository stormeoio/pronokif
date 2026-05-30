import pytest

from routes import minigames


class FakeMinigameCursor:
    def __init__(self, results: list[dict]) -> None:
        self.results = results

    def sort(self, *_args):
        return self

    async def to_list(self, _limit: int) -> list[dict]:
        return self.results


class FakeMinigameResultsCollection:
    def __init__(self, results: list[dict]) -> None:
        self.results = results
        self.last_query: dict | None = None

    def find(self, query: dict, _projection: dict | None = None) -> FakeMinigameCursor:
        self.last_query = query
        return FakeMinigameCursor(self.results)


class FakeMinigameDb:
    def __init__(self, results: list[dict]) -> None:
        self.minigame_results = FakeMinigameResultsCollection(results)


@pytest.mark.asyncio
async def test_get_my_minigame_scores_returns_frontend_completion_modes(monkeypatch):
    fake_db = FakeMinigameDb(
        [
            {
                "id": "result-1",
                "user_id": "user-1",
                "game_type": "reaction",
                "score": 231,
                "is_training": False,
                "league_id": "league-1",
                "race_id": "australia-2026",
                "created_at": "2026-05-30T08:00:00+00:00",
            },
            {
                "id": "result-2",
                "user_id": "user-1",
                "game_type": "reaction",
                "score": 260,
                "is_training": True,
                "league_id": "league-1",
                "race_id": "australia-2026",
                "created_at": "2026-05-30T07:00:00+00:00",
            },
        ]
    )
    monkeypatch.setattr(minigames, "db", fake_db)

    scores = await minigames.get_my_minigame_scores("reaction", {"id": "user-1"})

    assert fake_db.minigame_results.last_query == {"user_id": "user-1", "game_type": "reaction"}
    assert scores[0]["mode"] == "competition"
    assert scores[0]["score"] == 231
    assert scores[1]["mode"] == "training"
