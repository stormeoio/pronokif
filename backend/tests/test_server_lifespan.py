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
    monkeypatch.setattr(server, "ensure_indexes", fake_ensure_indexes)
    monkeypatch.setattr(server, "get_smtp_settings", lambda: None)
    monkeypatch.setattr(server, "auto_sync_loop", fake_auto_sync_loop)
    monkeypatch.setattr(server, "client", _FakeClient(calls))

    async with server.lifespan(server.app):
        await started.wait()
        assert calls[:2] == ["indexes", "sync_started"]
        assert server.auto_sync_task is not None

    assert calls == ["indexes", "sync_started", "sync_cancelled", "client_closed"]
    assert server.auto_sync_task is None
