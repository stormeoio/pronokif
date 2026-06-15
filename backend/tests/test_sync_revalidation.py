"""
Tests for the inter-GP re-validation feature — detecting and applying post-race
corrections (e.g. an FIA decision after the chequered flag) to already-classified
races, which the normal sync pass stops polling once results are complete.

Covers the new behaviour in services/sync.py, services/results.py and
services/sync_background.py:
- ``_results_equal`` diff-detection (gates the no-op),
- ``recently_completed_races`` selects the last race that ran,
- ``auto_sync_and_save``: an unchanged re-fetch is a true no-op (no re-write, no
  notification); a changed result on a complete race is stamped as a correction
  (``corrected_at``), preserves the original ``entered_at`` and re-scores,
- merge-preserve: a failed OpenF1 sub-fetch must not null stored bonus fields.

Reuses the faithful in-memory async Mongo from test_scoring_concurrency.
"""

from __future__ import annotations

import copy
from datetime import UTC, datetime

import pytest
from test_scoring_concurrency import FakeDb

from services import league_membership as league_membership_service
from services import results as results_service
from services import sync as sync_service
from services.sync import _results_equal
from services.sync_background import recently_completed_races

CHAMPIONSHIP_ID = "championship-f1-2026"
RACE_ID = "monaco-2026"


# ── _results_equal (pure) ─────────────────────────────────────────────────────

_BASE_RESULTS = {
    "quali_pole": "antonelli",
    "quali_top10": ["antonelli", "hamilton"],
    "sprint_quali_top10": [],
    "sprint_race_top10": [],
    "race_winner": "antonelli",
    "race_top10": ["antonelli", "hamilton", "gasly", "hadjar"],
    "bonus": {
        "safety_car": True,
        "dnf_drivers": ["sainz", "leclerc"],
        "fastest_lap": "antonelli",
        "first_corner_leader": None,
    },
}


def test_results_equal_identical():
    assert _results_equal(_BASE_RESULTS, copy.deepcopy(_BASE_RESULTS)) is True


def test_results_equal_dnf_order_insensitive():
    other = copy.deepcopy(_BASE_RESULTS)
    other["bonus"]["dnf_drivers"] = ["leclerc", "sainz"]
    assert _results_equal(_BASE_RESULTS, other) is True


def test_results_equal_top10_reorder_differs():
    other = copy.deepcopy(_BASE_RESULTS)
    other["race_top10"] = ["antonelli", "gasly", "hamilton", "hadjar"]
    assert _results_equal(_BASE_RESULTS, other) is False


def test_results_equal_bonus_change_differs():
    other = copy.deepcopy(_BASE_RESULTS)
    other["bonus"]["safety_car"] = False
    assert _results_equal(_BASE_RESULTS, other) is False


# ── recently_completed_races (pure, real 2026 calendar) ───────────────────────


def test_recently_completed_races_picks_last_started():
    # Between Monaco (2026-06-07) and Barcelona/spain (2026-06-14).
    now = datetime(2026, 6, 10, tzinfo=UTC)
    assert [r["id"] for r in recently_completed_races(now, 1)] == [RACE_ID]


def test_recently_completed_races_after_next_gp_shifts():
    now = datetime(2026, 6, 16, tzinfo=UTC)  # after Barcelona
    assert [r["id"] for r in recently_completed_races(now, 1)] == ["spain-2026"]


def test_recently_completed_races_zero_count_is_empty():
    now = datetime(2026, 6, 10, tzinfo=UTC)
    assert recently_completed_races(now, 0) == []


# ── auto_sync_and_save: diff / correction / merge-preserve ────────────────────


@pytest.fixture
def sync_env(monkeypatch):
    """In-memory db wired into sync + scoring services, with a captured
    notification sink. Returns (fake_db, notifications, monkeypatch)."""
    fake = FakeDb()
    monkeypatch.setattr(results_service, "db", fake)
    monkeypatch.setattr(league_membership_service, "db", fake)
    monkeypatch.setattr(sync_service, "db", fake)

    async def _ctx(_race_id: str) -> dict:
        return {"season": 2026, "championship_id": CHAMPIONSHIP_ID}

    notifications: list[tuple[str, str, str]] = []

    async def _notify(user_id: str, message: str, kind: str) -> None:
        notifications.append((user_id, message, kind))

    monkeypatch.setattr(results_service, "championship_context_for_race_id", _ctx)
    monkeypatch.setattr(results_service, "send_user_notification", _notify)
    return fake, notifications, monkeypatch


def _seed_player(fake: FakeDb, *, race_top10_pred: list[str]) -> None:
    fake.users.docs.append({"id": "u1", "xp": 0, "level": 1})
    fake.predictions.docs.append(
        {
            "id": "p1",
            "user_id": "u1",
            "race_id": RACE_ID,
            "race_winner": "antonelli",
            "race_top10": race_top10_pred,
            "quali_top10": [],
            "bonus_bets": {},
        }
    )
    fake.leagues.docs.append(
        {"id": "L1", "members": ["u1"], "created_by": "u1", "championship_id": CHAMPIONSHIP_ID, "season": 2026}
    )
    fake.leaderboard.docs.append(
        {
            "id": "lb1",
            "league_id": "L1",
            "user_id": "u1",
            "championship_id": CHAMPIONSHIP_ID,
            "season": 2026,
            "total_points": 0,
            "official_prediction_points": 0,
            "last_race_points": 0,
            "previous_position": None,
        }
    )


def _seed_stored_result(fake: FakeDb, results: dict, *, entered_at: str) -> None:
    fake.race_results.docs.append(
        {
            "race_id": RACE_ID,
            "results": copy.deepcopy(results),
            "entered_at": entered_at,
            "updated_at": entered_at,
            "auto_synced": True,
        }
    )


def _patch_fetchers(
    monkeypatch,
    *,
    race_top10: list[str],
    quali_pole=None,
    quali_top10=None,
    dnfs=None,
    fastest_lap=None,
    openf1=None,
):
    """Stub the network fetchers so auto_sync_and_save runs offline."""

    async def _resolve(_client, _race, _year):
        return ("6", [])

    async def _quali(_client, _year, _rnd, _n2id):
        return (quali_pole, quali_top10 or [])

    async def _race(_client, _year, _rnd, _n2id):
        winner = race_top10[0] if race_top10 else None
        return (winner, race_top10, dnfs or [], fastest_lap)

    async def _sprint(_client, _year, _rnd, _n2id):
        return (None, [])

    of1 = openf1 or {
        "safety_car": True,
        "first_corner_leader": None,
        "sprint_first_corner_leader": None,
        "_status": {"safety_car": True, "first_corner_leader": True},
    }

    async def _openf1(_client, _year, _race, _n2id):
        return of1

    monkeypatch.setattr(sync_service, "_resolve_round", _resolve)
    monkeypatch.setattr(sync_service, "_fetch_qualifying", _quali)
    monkeypatch.setattr(sync_service, "_fetch_race_results", _race)
    monkeypatch.setattr(sync_service, "_fetch_sprint", _sprint)
    monkeypatch.setattr(sync_service, "_fetch_openf1_data", _openf1)


@pytest.mark.asyncio
async def test_first_sync_is_success_without_correction(sync_env):
    fake, notifications, mp = sync_env
    _seed_player(fake, race_top10_pred=["antonelli", "hamilton", "gasly"])
    _patch_fetchers(mp, race_top10=["antonelli", "hamilton", "gasly", "hadjar"], quali_pole="antonelli")

    res = await sync_service.auto_sync_and_save(RACE_ID, "system")

    assert res["status"] == "success"
    assert res.get("corrected") is False
    doc = fake.race_results.docs[0]
    assert doc["results"]["race_top10"][2] == "gasly"
    assert "corrected_at" not in doc
    assert doc.get("entered_at") and doc.get("updated_at")


@pytest.mark.asyncio
async def test_unchanged_revalidation_is_a_noop(sync_env):
    fake, notifications, mp = sync_env
    stored = {
        "quali_pole": "antonelli",
        "quali_top10": ["antonelli"],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": "antonelli",
        "race_top10": ["antonelli", "hamilton", "gasly", "hadjar"],
        "bonus": {"safety_car": True, "dnf_drivers": ["sainz"], "fastest_lap": "antonelli", "first_corner_leader": None},
    }
    _seed_stored_result(fake, stored, entered_at="2026-06-07T15:00:00+00:00")
    _seed_player(fake, race_top10_pred=["antonelli", "hamilton", "gasly"])
    # Fetchers return exactly the stored classification.
    _patch_fetchers(
        mp,
        race_top10=list(stored["race_top10"]),
        quali_pole="antonelli",
        quali_top10=["antonelli"],
        dnfs=["sainz"],
        fastest_lap="antonelli",
        openf1={
            "safety_car": True,
            "first_corner_leader": None,
            "sprint_first_corner_leader": None,
            "_status": {"safety_car": True, "first_corner_leader": True},
        },
    )
    before_updated = fake.race_results.docs[0]["updated_at"]

    res = await sync_service.auto_sync_and_save(RACE_ID, "system")

    assert res["status"] == "unchanged"
    assert res["points_calculated"] == 0
    # The doc must NOT be re-written (no updated_at bump, no corrected_at).
    assert fake.race_results.docs[0]["updated_at"] == before_updated
    assert "corrected_at" not in fake.race_results.docs[0]
    assert all(kind != "results" for _, _, kind in notifications)


@pytest.mark.asyncio
async def test_correction_stamps_corrected_at_preserves_entered_at_and_rescores(sync_env):
    fake, notifications, mp = sync_env
    original_entered = "2026-06-07T15:00:00+00:00"
    stale = {
        "quali_pole": "antonelli",
        "quali_top10": [],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": "antonelli",
        "race_top10": ["antonelli", "hamilton", "hadjar", "piastri", "gasly"],  # gasly demoted P5
        "bonus": {"safety_car": True, "dnf_drivers": [], "fastest_lap": None, "first_corner_leader": None},
    }
    _seed_stored_result(fake, stale, entered_at=original_entered)
    _seed_player(fake, race_top10_pred=["antonelli", "hamilton", "gasly"])  # predicted gasly P3
    # First-score against the stale result so there is a prior snapshot.
    await results_service.set_official_and_score(
        race_id=RACE_ID, results=copy.deepcopy(stale), entered_by="seed", auto_synced=False
    )
    notifications.clear()

    corrected = ["antonelli", "hamilton", "gasly", "hadjar", "piastri"]  # gasly reinstated P3
    _patch_fetchers(mp, race_top10=corrected, quali_pole="antonelli")

    res = await sync_service.auto_sync_and_save(RACE_ID, "system-correction")

    assert res["status"] == "corrected"
    assert res["corrected"] is True
    doc = fake.race_results.docs[0]
    assert doc["results"]["race_top10"] == corrected
    assert doc.get("corrected_at"), "corrected_at must be stamped on a post-completion change"
    assert doc["entered_at"] == original_entered, "entered_at must be preserved across a correction"
    assert doc["updated_at"] != original_entered
    # The predictor gained the exact-P3 points → re-scored, notified.
    pred = next(p for p in fake.predictions.docs if p["id"] == "p1")
    assert pred["official_score"]["points_total"] > 0
    assert any(kind == "results" for _, _, kind in notifications)


@pytest.mark.asyncio
async def test_merge_preserve_keeps_stored_bonus_when_openf1_subfetch_fails(sync_env):
    fake, notifications, mp = sync_env
    stored = {
        "quali_pole": "antonelli",
        "quali_top10": [],
        "sprint_quali_top10": [],
        "sprint_race_top10": [],
        "race_winner": "antonelli",
        "race_top10": ["antonelli", "hamilton", "hadjar", "gasly"],
        "bonus": {"safety_car": True, "dnf_drivers": [], "fastest_lap": None, "first_corner_leader": "antonelli"},
    }
    _seed_stored_result(fake, stored, entered_at="2026-06-07T15:00:00+00:00")
    _seed_player(fake, race_top10_pred=["antonelli", "hamilton", "gasly"])
    # OpenF1 /position failed (429): first_corner_leader not ok; safety_car ok (=False now).
    # race_top10 changes so the pass actually writes (not a no-op).
    _patch_fetchers(
        mp,
        race_top10=["antonelli", "hamilton", "gasly", "hadjar"],
        quali_pole="antonelli",
        openf1={
            "safety_car": False,
            "first_corner_leader": None,
            "sprint_first_corner_leader": None,
            "_status": {"safety_car": True, "first_corner_leader": False},
        },
    )

    res = await sync_service.auto_sync_and_save(RACE_ID, "system")

    assert res["status"] == "corrected"
    bonus = fake.race_results.docs[0]["results"]["bonus"]
    # Preserved because OpenF1 had no definitive answer this pass…
    assert bonus["first_corner_leader"] == "antonelli"
    # …overwritten because OpenF1 did return a fresh safety_car.
    assert bonus["safety_car"] is False
