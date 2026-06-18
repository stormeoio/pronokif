import asyncio

import pytest

import server


class _FakeClient:
    def __init__(self, calls: list[str]) -> None:
        self.calls = calls

    def close(self) -> None:
        self.calls.append("client_closed")


@pytest.mark.asyncio
async def test_lifespan_starts_and_stops_background_services(monkeypatch):
    calls: list[str] = []
    started = asyncio.Event()

    async def fake_db_ready() -> None:
        calls.append("db_ready")

    async def fake_ensure_indexes() -> None:
        calls.append("indexes")

    async def fake_auto_sync_loop() -> None:
        calls.append("sync_started")
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            calls.append("sync_cancelled")
            raise

    monkeypatch.setattr(server, "auto_sync_task", None)
    monkeypatch.setattr(server, "_await_database_ready", fake_db_ready)
    monkeypatch.setattr(server, "ensure_indexes", fake_ensure_indexes)
    monkeypatch.setattr(server, "get_smtp_settings", lambda: None)
    monkeypatch.setattr(server, "auto_sync_loop", fake_auto_sync_loop)
    monkeypatch.setattr(server, "client", _FakeClient(calls))

    async with server.lifespan(server.app):
        await started.wait()
        assert calls[:3] == ["db_ready", "indexes", "sync_started"]
        assert server.auto_sync_task is not None

    assert calls == ["db_ready", "indexes", "sync_started", "sync_cancelled", "client_closed"]
    assert server.auto_sync_task is None


class _FakeAdmin:
    def __init__(self, fail_first: int) -> None:
        self.fail_first = fail_first
        self.calls = 0

    async def command(self, _cmd):
        self.calls += 1
        if self.calls <= self.fail_first:
            raise RuntimeError("ServerSelectionTimeoutError")
        return {"ok": 1}


class _FakeClientWithAdmin:
    def __init__(self, fail_first: int) -> None:
        self.admin = _FakeAdmin(fail_first)


@pytest.mark.asyncio
async def test_await_database_ready_retries_until_mongo_is_up(monkeypatch):
    # Regression: a host reboot can start the API before Mongo. The boot must
    # wait/retry instead of crashing on the first failed server selection.
    fake = _FakeClientWithAdmin(fail_first=2)
    monkeypatch.setattr(server, "client", fake)

    await server._await_database_ready(attempts=5, base_delay=0.01)

    assert fake.admin.calls == 3  # failed twice, succeeded on the third


@pytest.mark.asyncio
async def test_await_database_ready_raises_after_exhausting_attempts(monkeypatch):
    fake = _FakeClientWithAdmin(fail_first=99)
    monkeypatch.setattr(server, "client", fake)

    with pytest.raises(RuntimeError, match="ServerSelectionTimeoutError"):
        await server._await_database_ready(attempts=3, base_delay=0.01)

    assert fake.admin.calls == 3
