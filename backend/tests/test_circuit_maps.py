import pytest

from data.circuit_maps import circuit_map_brief, get_circuit_image_url, get_circuit_map
from routes import races as race_routes
from services import circuit_maps as circuit_map_service


class _FakeUpdateResult:
    def __init__(self, upserted_id=None):
        self.upserted_id = upserted_id


class _FakeCircuitMapCollection:
    def __init__(self, initial: dict | None = None):
        self.storage = dict(initial or {})

    async def find_one(self, query: dict, _projection: dict | None = None):
        value = self.storage.get(query.get("key"))
        return dict(value) if value else None

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        key = query["key"]
        exists = key in self.storage
        self.storage[key] = {**self.storage.get(key, {}), **update.get("$set", {})}
        if not exists:
            self.storage[key].update(update.get("$setOnInsert", {}))
        return _FakeUpdateResult(upserted_id=key if upsert and not exists else None)


class _FakeKnowledgeEntities:
    def __init__(self):
        self.last_update = None

    async def update_one(self, query: dict, update: dict):
        self.last_update = {"query": query, "update": update}


class _FakeCircuitMapDb:
    def __init__(self, circuit_maps: dict | None = None):
        self.circuit_maps = _FakeCircuitMapCollection(circuit_maps)
        self.knowledge_entities = _FakeKnowledgeEntities()


def test_get_circuit_map_resolves_aliases_and_translatable_labels():
    circuit_map = get_circuit_map("Circuit de Monaco")

    assert circuit_map is not None
    assert circuit_map["key"] == "monaco"
    assert circuit_map["features"][0]["label"]["fr"] == "Ligne de départ"
    assert circuit_map["features"][0]["label"]["en"] == "Start line"
    assert any(feature["id"] == "sainte-devote" for feature in circuit_map["features"])


def test_static_fallback_image_remains_available_without_interactive_metadata():
    assert get_circuit_map("Baku") is None
    assert "Baku_Formula_One_circuit_map" in (get_circuit_image_url("Baku") or "")


def test_circuit_map_brief_summarizes_features_for_rag():
    brief = circuit_map_brief(get_circuit_map("Monza"))

    assert brief is not None
    assert "Points de carte interactive" in brief
    assert "Variante del Rettifilo" in brief


@pytest.mark.asyncio
async def test_circuit_map_update_preserves_existing_admin_map(monkeypatch):
    fake_db = _FakeCircuitMapDb(
        {
            "monaco": {
                "key": "monaco",
                "circuit_name": "Monaco",
                "map_data": {
                    "key": "monaco",
                    "circuitName": "Monaco",
                    "fallbackImageUrl": "https://example.test/monaco.svg",
                    "viewBox": "0 0 420 280",
                    "trackPath": "M 10 10 L 20 20",
                    "features": [
                        {
                            "id": "custom",
                            "kind": "corner",
                            "x": 12,
                            "y": 14,
                            "label": {"fr": "Point admin", "en": "Admin point"},
                            "note": {"fr": "Note admin", "en": "Admin note"},
                        }
                    ],
                    "zones": [
                        {
                            "id": "zone-admin",
                            "kind": "sector",
                            "path": "M 10 10 L 20 20",
                            "label": {"fr": "Zone admin", "en": "Admin zone"},
                            "note": {"fr": "Note zone", "en": "Zone note"},
                        }
                    ],
                },
                "review_status": "draft",
                "data_status": "admin",
                "owner_admin_email": "ops@example.test",
                "admin_notes": "Première passe",
            }
        }
    )
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    record = await circuit_map_service.update_circuit_map_record(
        "monaco",
        review_status="approved",
        actor="admin@example.test",
    )

    assert record is not None
    assert record["review_status"] == "approved"
    assert record["map_data"]["fallbackImageUrl"] == "https://example.test/monaco.svg"
    assert record["map_data"]["features"][0]["id"] == "custom"
    assert fake_db.knowledge_entities.last_update["update"]["$set"]["circuit.interactive_map"][
        "trackPath"
    ] == "M 10 10 L 20 20"


@pytest.mark.asyncio
async def test_circuit_map_update_rejects_invalid_translatable_payload(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    with pytest.raises(ValueError, match="label.en est requis"):
        await circuit_map_service.update_circuit_map_record(
            "monaco",
            map_data={
                "key": "monaco",
                "circuitName": "Monaco",
                "fallbackImageUrl": "https://example.test/monaco.svg",
                "viewBox": "0 0 420 280",
                "trackPath": "M 10 10 L 20 20",
                "features": [
                    {
                        "id": "turn-admin",
                        "kind": "corner",
                        "x": 100,
                        "y": 120,
                        "label": {"fr": "Virage admin"},
                        "note": {"fr": "Note admin", "en": "Admin note"},
                    }
                ],
                "zones": [],
            },
            actor="admin@example.test",
        )


@pytest.mark.asyncio
async def test_circuit_map_update_blocks_approval_until_publishable(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    with pytest.raises(ValueError, match="doit être publiable"):
        await circuit_map_service.update_circuit_map_record(
            "baku",
            review_status="approved",
            actor="admin@example.test",
        )


@pytest.mark.asyncio
async def test_race_details_payload_includes_backend_circuit_map(monkeypatch):
    async def fake_find_calendar_race(race_id: str):
        return {
            "id": race_id,
            "name": "Monaco Grand Prix",
            "circuit": "Monaco",
            "country": "Monaco",
            "date": "2026-06-07",
            "race_time": "15:00",
            "quali_date": "2026-06-06",
            "quali_time": "16:00",
            "fp1_date": "2026-06-05",
            "fp1_time": "13:30",
            "fp2_date": "2026-06-05",
            "fp2_time": "17:00",
            "fp3_date": "2026-06-06",
            "fp3_time": "12:30",
            "timezone": "Europe/Monaco",
            "is_sprint": False,
        }

    async def fake_race_result_doc(_race_id: str):
        return None

    async def fake_effective_map(_circuit_name: str):
        return get_circuit_map("Monaco")

    async def fake_effective_image(_circuit_name: str):
        return get_circuit_image_url("Monaco")

    monkeypatch.setattr(race_routes, "_find_calendar_race", fake_find_calendar_race)
    monkeypatch.setattr(race_routes, "_race_result_doc", fake_race_result_doc)
    monkeypatch.setattr(race_routes, "get_effective_circuit_map", fake_effective_map)
    monkeypatch.setattr(race_routes, "get_effective_circuit_image_url", fake_effective_image)

    payload = await race_routes.get_race_details("monaco-2026")

    assert payload["circuit"]["map_status"] == "interactive_seeded"
    assert payload["circuit"]["map_image_url"]
    assert payload["circuit_map"]["key"] == "monaco"
    assert payload["circuit_map"]["features"][1]["id"] == "sainte-devote"
