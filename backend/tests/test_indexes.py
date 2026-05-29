from __future__ import annotations

from typing import Any

import pytest

from services import indexes as index_service


class _FakeIndexCollection:
    def __init__(self) -> None:
        self.indexes: list[tuple[Any, dict[str, Any]]] = []

    async def create_index(self, keys: Any, **kwargs: Any) -> None:
        self.indexes.append((keys, kwargs))


class _FakeIndexDb:
    def __init__(self) -> None:
        self.collections: dict[str, _FakeIndexCollection] = {}

    def __getattr__(self, name: str) -> _FakeIndexCollection:
        if name not in self.collections:
            self.collections[name] = _FakeIndexCollection()
        return self.collections[name]


@pytest.mark.asyncio
async def test_ensure_indexes_covers_circuit_maps_and_rag_queries(monkeypatch):
    fake_db = _FakeIndexDb()
    monkeypatch.setattr(index_service, "db", fake_db)

    await index_service.ensure_indexes()

    circuit_map_indexes = fake_db.collections["circuit_maps"].indexes
    assert ("key", {"unique": True}) in circuit_map_indexes
    assert ("review_status", {}) in circuit_map_indexes
    assert ([("review_status", 1), ("updated_at", -1)], {}) in circuit_map_indexes

    entity_indexes = fake_db.collections["knowledge_entities"].indexes
    assert ([("championship_id", 1), ("entity_type", 1), ("canonical_key", 1)], {}) in entity_indexes
    assert ([("search_text", "text")], {"default_language": "none"}) in entity_indexes

    document_indexes = fake_db.collections["knowledge_documents"].indexes
    assert ([("championship_id", 1), ("entity_type", 1), ("embedding.status", 1)], {}) in document_indexes
    assert ([("search_text", "text")], {"default_language": "none"}) in document_indexes
