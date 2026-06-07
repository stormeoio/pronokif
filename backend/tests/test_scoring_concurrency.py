"""
Regression tests for concurrent official-results scoring.

The auto-sync loop runs in every uvicorn worker (Dockerfile: ``--workers 2``),
so two passes can score the same race simultaneously during a live result
window. Before the fix, ``set_official_and_score`` read the previous score
snapshot and then ``$inc``-ed XP / leaderboard points in two separate awaits:
two concurrent passes both read ``previous=None`` and both applied the full
delta, double-counting XP and league points.

These tests pin the two layers of the fix:

1. ``_apply_official_results_and_score`` (the scoring pass, lock bypassed) is
   idempotent under concurrency thanks to the atomic ``find_one_and_update``
   snapshot capture. This is the core correctness guarantee and would fail
   against the old read-then-write implementation.
2. ``set_official_and_score`` wraps the pass in a best-effort per-race advisory
   lock, so a second concurrent worker no-ops instead of re-walking the pass.

The fake Mongo below faithfully models the only property that matters here:
``find_one_and_update`` is atomic (no interleaving await between its read and
write), while plain ``find_one`` + ``update_one`` yield in between — exactly the
window the bug lived in.
"""

from __future__ import annotations

import asyncio
import copy
import uuid

import pytest
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from services import league_membership as league_membership_service
from services import results as results_service
from services.scoring import calculate_points

_MISSING = object()


# ── Minimal but faithful in-memory async Mongo ───────────────────────────────


def _matches(doc: dict, query: dict) -> bool:
    for key, cond in query.items():
        if key == "$or":
            if not any(_matches(doc, sub) for sub in cond):
                return False
            continue
        actual = doc.get(key, _MISSING)
        if isinstance(cond, dict):
            for op, operand in cond.items():
                if op == "$exists":
                    if (actual is not _MISSING) != bool(operand):
                        return False
                elif op == "$lt":
                    if actual is _MISSING or not (actual < operand):
                        return False
                elif op == "$gt":
                    if actual is _MISSING or not (actual > operand):
                        return False
                elif op == "$in":
                    if actual is _MISSING or actual not in operand:
                        return False
                else:  # pragma: no cover - guard for unsupported operators
                    raise NotImplementedError(f"query operator {op}")
            continue
        # Scalar equality with Mongo's array-contains semantics.
        if isinstance(actual, list):
            if cond not in actual:
                return False
        elif actual is _MISSING:
            if cond is not None:
                return False
        elif actual != cond:
            return False
    return True


def _apply_update(doc: dict, update: dict) -> None:
    for op, fields in update.items():
        if op == "$set":
            doc.update(copy.deepcopy(fields))
        elif op == "$inc":
            for key, value in fields.items():
                doc[key] = (doc.get(key) or 0) + value
        elif op == "$setOnInsert":
            continue  # applied on insert only
        else:  # pragma: no cover - guard for unsupported operators
            raise NotImplementedError(f"update operator {op}")


def _seed_from_upsert(query: dict, update: dict) -> dict:
    doc: dict = {}
    for key, cond in query.items():
        if key.startswith("$") or isinstance(cond, dict):
            continue
        doc[key] = copy.deepcopy(cond)
    doc.update(copy.deepcopy(update.get("$setOnInsert", {})))
    doc.update(copy.deepcopy(update.get("$set", {})))
    for key, value in update.get("$inc", {}).items():
        doc[key] = (doc.get(key) or 0) + value
    return doc


def _project(doc: dict) -> dict:
    doc.pop("_id", None)  # mimic the ``{"_id": 0}`` projection callers use
    return doc


def _result(**fields):
    return type("Result", (), fields)()


class FakeCursor:
    def __init__(self, docs: list[dict]) -> None:
        self._docs = docs

    def sort(self, *_args, **_kwargs) -> FakeCursor:
        return self  # callers in this path sort in Python

    async def to_list(self, _length: int | None = None) -> list[dict]:
        await asyncio.sleep(0)
        return [_project(copy.deepcopy(d)) for d in self._docs]


class FakeCollection:
    def __init__(self) -> None:
        self.docs: list[dict] = []

    async def find_one(self, query: dict, _projection: dict | None = None) -> dict | None:
        await asyncio.sleep(0)
        for doc in self.docs:
            if _matches(doc, query):
                return _project(copy.deepcopy(doc))
        return None

    def find(self, query: dict, _projection: dict | None = None) -> FakeCursor:
        return FakeCursor([d for d in self.docs if _matches(d, query)])

    async def insert_one(self, document: dict):
        await asyncio.sleep(0)
        document = copy.deepcopy(document)
        if "_id" in document:
            if any(d.get("_id") == document["_id"] for d in self.docs):
                raise DuplicateKeyError(f"duplicate key _id={document['_id']}")
        else:
            document["_id"] = str(uuid.uuid4())
        self.docs.append(document)
        return _result(inserted_id=document["_id"])

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        await asyncio.sleep(0)
        for doc in self.docs:
            if _matches(doc, query):
                _apply_update(doc, update)
                return _result(matched_count=1, modified_count=1)
        if upsert:
            self.docs.append(_seed_from_upsert(query, update))
            return _result(matched_count=0, modified_count=0, upserted_id=1)
        return _result(matched_count=0, modified_count=0)

    async def update_many(self, query: dict, update: dict):
        await asyncio.sleep(0)
        count = 0
        for doc in self.docs:
            if _matches(doc, query):
                _apply_update(doc, update)
                count += 1
        return _result(matched_count=count, modified_count=count)

    async def find_one_and_update(
        self,
        query: dict,
        update: dict,
        upsert: bool = False,
        return_document=ReturnDocument.BEFORE,
        projection: dict | None = None,
    ) -> dict | None:
        # ATOMIC: the single yield models the round-trip, but the read-modify-write
        # below runs without an intervening await, so no other coroutine can slip
        # between the snapshot read and the write. This is the property that makes
        # concurrent scoring idempotent.
        await asyncio.sleep(0)
        for doc in self.docs:
            if _matches(doc, query):
                before = copy.deepcopy(doc)
                _apply_update(doc, update)
                chosen = before if return_document == ReturnDocument.BEFORE else doc
                return _project(copy.deepcopy(chosen))
        if upsert:
            new_doc = _seed_from_upsert(query, update)
            self.docs.append(new_doc)
            if return_document == ReturnDocument.BEFORE:
                return None
            return _project(copy.deepcopy(new_doc))
        return None

    async def delete_one(self, query: dict):
        await asyncio.sleep(0)
        for index, doc in enumerate(self.docs):
            if _matches(doc, query):
                del self.docs[index]
                return _result(deleted_count=1)
        return _result(deleted_count=0)


class FakeDb:
    def __init__(self) -> None:
        self.__dict__["_collections"]: dict[str, FakeCollection] = {}

    def __getattr__(self, name: str) -> FakeCollection:
        cols = self.__dict__["_collections"]
        if name not in cols:
            cols[name] = FakeCollection()
        return cols[name]


# ── Fixtures ─────────────────────────────────────────────────────────────────

RACE_ID = "monaco-2026"
CHAMPIONSHIP_ID = "championship-f1-2026"

RESULTS = {
    "quali_pole": "verstappen",
    "quali_top10": [],
    "sprint_quali_top10": [],
    "sprint_race_top10": [],
    "race_winner": "leclerc",
    "race_top10": ["leclerc"],
    "bonus": {"safety_car": None, "dnf_drivers": [], "fastest_lap": None, "first_corner_leader": None},
}
PREDICTION = {
    "id": "p1",
    "user_id": "u1",
    "race_id": RACE_ID,
    "race_winner": "leclerc",
    "race_top10": ["leclerc"],
    "quali_top10": [],
    "bonus_bets": {},
}

# Derive the single-pass expectation from the scoring engine itself, so these
# tests assert the real invariant — concurrent scoring == one pass, never 2x —
# rather than hardcoding numbers that drift when scoring rules change.
_SINGLE = calculate_points(PREDICTION, RESULTS)
EXPECTED_POINTS = _SINGLE["total"]
EXPECTED_XP = _SINGLE["xp_earned"]
assert EXPECTED_POINTS > 0 and EXPECTED_XP > 0  # guard: a meaningless 0/0 case wouldn't test doubling


@pytest.fixture
def scoring_env(monkeypatch):
    """Patch the scoring services onto an in-memory db with one user, one
    prediction and one league/leaderboard row already seeded."""
    fake = FakeDb()
    monkeypatch.setattr(results_service, "db", fake)
    monkeypatch.setattr(league_membership_service, "db", fake)

    async def _fixed_context(_race_id: str) -> dict:
        return {"season": 2026, "championship_id": CHAMPIONSHIP_ID}

    notifications: list[tuple[str, str, str]] = []

    async def _capture_notification(user_id: str, message: str, kind: str) -> None:
        notifications.append((user_id, message, kind))

    monkeypatch.setattr(results_service, "championship_context_for_race_id", _fixed_context)
    monkeypatch.setattr(results_service, "send_user_notification", _capture_notification)

    fake.users.docs.append({"id": "u1", "xp": 0, "level": 1})
    fake.predictions.docs.append(copy.deepcopy(PREDICTION))
    fake.leagues.docs.append(
        {
            "id": "L1",
            "members": ["u1"],
            "created_by": "u1",
            "championship_id": CHAMPIONSHIP_ID,
            "season": 2026,
        }
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
    return fake, notifications


def _user_xp(fake: FakeDb) -> int:
    return next(d for d in fake.users.docs if d["id"] == "u1")["xp"]


def _leaderboard_points(fake: FakeDb) -> int:
    rows = [d for d in fake.leaderboard.docs if d["user_id"] == "u1" and d["league_id"] == "L1"]
    return sum(int(r.get("total_points") or 0) for r in rows)


# ── Tests ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_single_scoring_pass_awards_expected_points(scoring_env):
    fake, notifications = scoring_env

    processed = await results_service.set_official_and_score(
        race_id=RACE_ID, results=RESULTS, entered_by="system", auto_synced=True
    )

    assert processed == 1
    assert _user_xp(fake) == EXPECTED_XP
    assert _leaderboard_points(fake) == EXPECTED_POINTS
    assert sum(1 for _, _, kind in notifications if kind == "results") == 1


@pytest.mark.asyncio
async def test_concurrent_scoring_passes_do_not_double_count(scoring_env):
    """The scoring write itself (lock bypassed) must be idempotent under
    concurrency. This fails against the old find_one + update_one path."""
    fake, notifications = scoring_env

    await asyncio.gather(
        results_service._apply_official_results_and_score(
            race_id=RACE_ID, results=RESULTS, entered_by="system", auto_synced=True
        ),
        results_service._apply_official_results_and_score(
            race_id=RACE_ID, results=RESULTS, entered_by="system", auto_synced=True
        ),
    )

    assert _user_xp(fake) == EXPECTED_XP, "XP was double-counted under concurrency"
    assert _leaderboard_points(fake) == EXPECTED_POINTS, "League points were double-counted"
    # Only the pass that captured the non-zero delta should notify.
    assert sum(1 for _, _, kind in notifications if kind == "results") == 1


@pytest.mark.asyncio
async def test_advisory_lock_makes_second_worker_noop(scoring_env):
    """Two concurrent calls through the public entry point: the lock holder
    scores once, the other no-ops (returns 0) instead of re-walking the pass."""
    fake, notifications = scoring_env

    processed = await asyncio.gather(
        results_service.set_official_and_score(
            race_id=RACE_ID, results=RESULTS, entered_by="system", auto_synced=True
        ),
        results_service.set_official_and_score(
            race_id=RACE_ID, results=RESULTS, entered_by="system", auto_synced=True
        ),
    )

    assert sorted(processed) == [0, 1], "exactly one worker should perform the scoring pass"
    assert _user_xp(fake) == EXPECTED_XP
    assert _leaderboard_points(fake) == EXPECTED_POINTS
    assert sum(1 for _, _, kind in notifications if kind == "results") == 1
    # Lock is released after the pass so later syncs (e.g. result corrections) run.
    assert fake.sync_locks.docs == []


@pytest.mark.asyncio
async def test_manual_entry_is_never_skipped_by_a_held_lock(scoring_env):
    """A manual admin / league-creator entry (auto_synced=False) must score even
    while the auto-sync loop holds the lock — operator results must never be
    silently dropped."""
    fake, _ = scoring_env
    # Simulate the auto-sync worker currently holding the lock for this race.
    assert await results_service._acquire_score_lock(RACE_ID, "auto-sync-token") is True

    processed = await results_service.set_official_and_score(
        race_id=RACE_ID, results=RESULTS, entered_by="admin-user", auto_synced=False
    )

    assert processed == 1, "manual entry was skipped while a background lock was held"
    assert _user_xp(fake) == EXPECTED_XP
    assert _leaderboard_points(fake) == EXPECTED_POINTS


@pytest.mark.asyncio
async def test_score_lock_acquire_release_and_stale_takeover(scoring_env):
    fake, _ = scoring_env

    assert await results_service._acquire_score_lock(RACE_ID, "token-a") is True
    # A fresh lock blocks a second acquirer.
    assert await results_service._acquire_score_lock(RACE_ID, "token-b") is False

    # A different worker must not be able to release a lock it does not own.
    await results_service._release_score_lock(RACE_ID, "token-b")
    assert len(fake.sync_locks.docs) == 1

    # Simulate the holder having crashed: force the lock past its TTL.
    fake.sync_locks.docs[0]["expires_at"] = datetime_min()
    assert await results_service._acquire_score_lock(RACE_ID, "token-c") is True

    # The owner can release it.
    await results_service._release_score_lock(RACE_ID, "token-c")
    assert fake.sync_locks.docs == []


def datetime_min():
    from datetime import UTC, datetime

    return datetime(1970, 1, 1, tzinfo=UTC)
