from copy import deepcopy

import pytest

from data.circuit_maps import CIRCUIT_MAPS, circuit_map_brief, get_circuit_image_url, get_circuit_map
from routes import races as race_routes
from services import circuit_maps as circuit_map_service


class _FakeUpdateResult:
    def __init__(self, upserted_id=None):
        self.upserted_id = upserted_id


class _FakeDeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class _FakeCircuitMapCollection:
    def __init__(self, initial: dict | None = None):
        self.storage = dict(initial or {})

    async def find_one(self, query: dict, _projection: dict | None = None):
        value = self.storage.get(query.get("key"))
        return dict(value) if value else None

    def find(self, _query: dict, _projection: dict | None = None):
        class _Cursor:
            def __init__(self, values):
                self.values = values

            async def to_list(self, _limit: int):
                return [dict(value) for value in self.values]

        return _Cursor(self.storage.values())

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        key = query["key"]
        exists = key in self.storage
        self.storage[key] = {**self.storage.get(key, {}), **update.get("$set", {})}
        if not exists:
            self.storage[key].update(update.get("$setOnInsert", {}))
        return _FakeUpdateResult(upserted_id=key if upsert and not exists else None)

    async def delete_one(self, query: dict):
        key = query["key"]
        deleted = 1 if key in self.storage else 0
        self.storage.pop(key, None)
        return _FakeDeleteResult(deleted_count=deleted)


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


def test_seeded_maps_identify_first_corner_for_driver_stats():
    for circuit_map in CIRCUIT_MAPS:
        feature_by_id = {feature["id"]: feature for feature in circuit_map["features"]}
        first_corner = circuit_map.get("firstCorner")

        assert first_corner, circuit_map["key"]
        assert first_corner["hotspotId"] in feature_by_id, circuit_map["key"]
        assert feature_by_id[first_corner["hotspotId"]]["kind"] == "corner", circuit_map["key"]
        assert feature_by_id[first_corner["hotspotId"]]["turn"] == 1, circuit_map["key"]
        assert first_corner["label"]["fr"], circuit_map["key"]
        assert first_corner["label"]["en"], circuit_map["key"]
        assert first_corner["note"]["fr"], circuit_map["key"]
        assert first_corner["note"]["en"], circuit_map["key"]

    assert get_circuit_map("Suzuka")["firstCorner"]["hotspotId"] == "turn-1"
    assert get_circuit_map("Silverstone")["firstCorner"]["hotspotId"] == "abbey"


def test_static_fallback_image_remains_available_without_interactive_metadata():
    assert get_circuit_map("Imola") is None
    assert "Imola_2009" in (get_circuit_image_url("Imola") or "")


def test_zandvoort_interactive_map_feeds_race_details_and_rag():
    circuit_map = get_circuit_map("Dutch Grand Prix")

    assert circuit_map is not None
    assert circuit_map["key"] == "zandvoort"
    assert any(feature["id"] == "tarzan" for feature in circuit_map["features"])
    assert any(zone["id"] == "drs-main" for zone in circuit_map["zones"])


def test_next_european_race_batch_has_interactive_maps():
    cases = [
        ("Spanish Grand Prix", "barcelona", "la-caixa"),
        ("Chinese Grand Prix", "shanghai", "hairpin"),
        ("Bahrain International Circuit", "sakhir", "turn-4"),
        ("Saudi Arabian Grand Prix", "jeddah", "corniche"),
        ("Miami Grand Prix", "miami", "tight-section"),
        ("Circuit Gilles-Villeneuve", "montreal", "wall-of-champions"),
        ("Spielberg", "red-bull-ring", "remus"),
        ("Hungarian Grand Prix", "hungaroring", "chicane"),
        ("Madring", "madrid", "ifema-section"),
        ("Baku City Circuit", "baku", "castle"),
        ("Singapore Grand Prix", "marina-bay", "anderson-bridge"),
        ("Circuit of the Americas", "cota", "esses"),
        ("Mexico City Grand Prix", "hermanos-rodriguez", "stadium"),
        ("Brazilian Grand Prix", "interlagos", "senna-s"),
        ("Las Vegas Grand Prix", "las-vegas", "strip"),
        ("Qatar Grand Prix", "lusail", "flowing-sector"),
        ("Abu Dhabi Grand Prix", "yas-marina", "hairpin"),
    ]

    for alias, expected_key, expected_feature in cases:
        circuit_map = get_circuit_map(alias)
        assert circuit_map is not None
        assert circuit_map["key"] == expected_key
        assert any(feature["id"] == expected_feature for feature in circuit_map["features"])


def test_circuit_map_brief_summarizes_features_for_rag():
    brief = circuit_map_brief(get_circuit_map("Monza"))

    assert brief is not None
    assert "Premier virage identifié" in brief
    assert "Points de carte interactive" in brief
    assert "Variante del Rettifilo" in brief


def test_circuit_map_quality_blocks_interactive_map_without_first_corner():
    map_data = deepcopy(get_circuit_map("Monaco"))
    map_data.pop("firstCorner")

    quality = circuit_map_service._map_quality_report(map_data)
    priority = circuit_map_service._review_priority(
        {"quality_report": quality, "review_status": "draft"}
    )

    assert quality["has_first_corner"] is False
    assert "Premier virage non identifié" in quality["warnings"]
    assert quality["ready_for_public"] is False
    assert priority["level"] == "blocked"
    assert priority["label"] == "Premier virage"


@pytest.mark.asyncio
async def test_circuit_map_list_exposes_editorial_priority_and_coverage(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    payload = await circuit_map_service.list_circuit_map_records(q="Miami")

    assert payload["summary"]["coverage_percent"] == 100
    assert payload["summary"]["ready_for_public"] == 1
    assert payload["summary"]["total_features"] >= 5
    assert payload["items"][0]["review_priority"]["level"] == "review"
    assert payload["items"][0]["review_priority"]["label"] == "À revoir"


@pytest.mark.asyncio
async def test_circuit_map_list_filters_editorial_priority(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    payload = await circuit_map_service.list_circuit_map_records(q="Imola", priority="blocked")

    assert payload["total"] == 1
    assert payload["items"][0]["key"] == "imola"
    assert payload["items"][0]["review_priority"]["level"] == "blocked"


@pytest.mark.asyncio
async def test_circuit_map_list_filters_owner_and_source(monkeypatch):
    fake_db = _FakeCircuitMapDb(
        {
            "monaco": {
                "key": "monaco",
                "circuit_name": "Monaco",
                "map_data": deepcopy(get_circuit_map("Monaco")),
                "review_status": "in_review",
                "data_status": "admin",
                "owner_admin_email": "fred@stormeo.io",
                "admin_notes": "Passe tracé",
            },
            "miami": {
                "key": "miami",
                "circuit_name": "Miami",
                "map_data": deepcopy(get_circuit_map("Miami")),
                "review_status": "in_review",
                "data_status": "admin",
                "owner_admin_email": "ops@example.test",
                "admin_notes": "Autre admin",
            },
        }
    )
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    my_payload = await circuit_map_service.list_circuit_map_records(
        owner="mine",
        source="admin",
        current_admin_email="fred@stormeo.io",
    )
    unassigned_payload = await circuit_map_service.list_circuit_map_records(owner="unassigned")

    assert my_payload["total"] == 1
    assert my_payload["items"][0]["key"] == "monaco"
    assert my_payload["summary"]["owned_by_me"] == 1
    assert all(item["source"] == "admin" for item in my_payload["items"])
    assert unassigned_payload["summary"]["unassigned"] == unassigned_payload["total"]


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
                            "turn": 1,
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
                    "firstCorner": {
                        "hotspotId": "custom",
                        "label": {"fr": "Point admin", "en": "Admin point"},
                        "note": {"fr": "Premier virage admin", "en": "Admin first corner"},
                    },
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
async def test_circuit_map_reset_removes_admin_override_and_syncs_seed(monkeypatch):
    fake_db = _FakeCircuitMapDb(
        {
            "monaco": {
                "key": "monaco",
                "circuit_name": "Monaco",
                "map_data": {
                    "key": "monaco",
                    "circuitName": "Monaco",
                    "fallbackImageUrl": "https://example.test/admin.svg",
                    "viewBox": "0 0 420 280",
                    "trackPath": "M 10 10 L 20 20",
                    "features": [],
                    "zones": [],
                },
                "review_status": "draft",
                "data_status": "admin",
            }
        }
    )
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    record = await circuit_map_service.reset_circuit_map_record("monaco", actor="admin@example.test")

    assert record is not None
    assert record["source"] == "seed"
    assert record["reset"] is True
    assert "monaco" not in fake_db.circuit_maps.storage
    assert fake_db.knowledge_entities.last_update["update"]["$set"]["circuit.interactive_map"][
        "key"
    ] == "monaco"


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
async def test_circuit_map_update_rejects_invalid_svg_path(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)
    map_data = deepcopy(get_circuit_map("Miami"))
    map_data["zones"][0]["path"] = "M281 73 C334 105 349 160"

    with pytest.raises(ValueError, match=r"zones\[0\]\.path est incomplet"):
        await circuit_map_service.update_circuit_map_record(
            "miami",
            map_data=map_data,
            actor="admin@example.test",
        )


@pytest.mark.asyncio
async def test_circuit_map_update_blocks_approval_until_publishable(monkeypatch):
    fake_db = _FakeCircuitMapDb()
    monkeypatch.setattr(circuit_map_service, "db", fake_db)

    with pytest.raises(ValueError, match="doit être publiable"):
        await circuit_map_service.update_circuit_map_record(
            "imola",
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
