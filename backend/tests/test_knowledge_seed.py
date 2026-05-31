import pytest

from services import knowledge_seed as knowledge_seed_service
from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.knowledge_seed import (
    LOCAL_EMBEDDING_DIMENSIONS,
    build_f1_2026_knowledge_bundle,
    driver_brief_from_context,
    local_embedding_vector,
    prediction_brief_from_context,
    team_brief_from_context,
)


class _FakeKnowledgeEntitiesCollection:
    def __init__(self, document: dict) -> None:
        self.document = document
        self.last_update: tuple[dict, dict] | None = None

    async def find_one(self, query: dict, projection: dict | None = None) -> dict | None:
        if query.get("id") != self.document.get("id"):
            return None
        document = dict(self.document)
        if projection == {"_id": 0}:
            document.pop("_id", None)
        return document

    async def update_one(self, query: dict, update: dict) -> None:
        self.last_update = (query, update)
        self.document.update(update.get("$set", {}))


class _FakeKnowledgeDb:
    def __init__(self, document: dict) -> None:
        self.knowledge_entities = _FakeKnowledgeEntitiesCollection(document)


def _entities(bundle: dict, entity_type: str) -> list[dict]:
    return [entity for entity in bundle["entities"] if entity["entity_type"] == entity_type]


def test_f1_knowledge_bundle_links_core_entity_types():
    bundle = build_f1_2026_knowledge_bundle()

    assert bundle["summary"]["sources"] == 14
    assert bundle["summary"]["entity_types"]["championship"] == 1
    assert bundle["summary"]["entity_types"]["season"] == 1
    assert bundle["summary"]["entity_types"]["race"] == 24
    assert bundle["summary"]["entity_types"]["circuit"] == 24
    assert bundle["summary"]["entity_types"]["location"] == 24
    assert bundle["summary"]["entity_types"]["team"] == 11
    assert bundle["summary"]["entity_types"]["constructor"] == 11
    assert bundle["summary"]["entity_types"]["technical_team"] == 11
    assert bundle["summary"]["entity_types"]["driver"] == 22

    assert all(entity["championship_id"] == F1_2026_CHAMPIONSHIP_ID for entity in bundle["entities"])
    assert all(document["embedding"]["status"] == "pending" for document in bundle["documents"])
    assert all(document["content_translations"]["fr"] for document in bundle["documents"])


def test_f1_knowledge_bundle_adds_championship_and_season_nodes():
    bundle = build_f1_2026_knowledge_bundle()

    championship = _entities(bundle, "championship")[0]
    season = _entities(bundle, "season")[0]
    monaco = next(entity for entity in _entities(bundle, "race") if entity["race_id"] == "monaco-2026")

    assert championship["championship_record_id"] == F1_2026_CHAMPIONSHIP_ID
    assert championship["slug"] == "formula-1-2026"
    assert championship["name_translations"]["fr"] == "Formule 1 2026"
    assert championship["active_races_count"] == 22
    assert championship["cancelled_races_count"] == 2
    assert season["year"] == 2026
    assert season["linked_championship_ids"] == [championship["id"]]
    assert "monaco-2026" in season["linked_race_ids"]
    assert {"part_of_championship", "part_of_season"}.issubset(
        {relation["relation"] for relation in monaco["relations"]}
    )
    assert any(document["entity_type"] == "championship" for document in bundle["documents"])
    assert any(document["entity_type"] == "season" for document in bundle["documents"])


def test_f1_knowledge_bundle_enriches_circuits_locations_and_countries():
    bundle = build_f1_2026_knowledge_bundle()

    madrid = next(entity for entity in _entities(bundle, "circuit") if entity["canonical_key"] == "Madrid")
    monaco = next(entity for entity in _entities(bundle, "circuit") if entity["canonical_key"] == "Monaco")
    madrid_location = next(entity for entity in bundle["entities"] if entity["id"] == madrid["location_id"])
    spain = next(entity for entity in _entities(bundle, "country") if entity["country_code"] == "ES")

    assert madrid["circuit"]["venue_type"] == "hybrid_street_circuit"
    assert madrid["circuit"]["map_status"] == "interactive_seeded"
    assert any(
        feature["id"] == "ifema-section"
        for feature in madrid["circuit"]["interactive_map"]["features"]
    )
    assert monaco["circuit"]["map_status"] == "interactive_seeded"
    assert monaco["circuit"]["interactive_map"]["features"][1]["id"] == "sainte-devote"
    assert madrid_location["location"]["city"] == "Madrid"
    assert madrid_location["location"]["address_status"] == "host_area_pending_final_circuit"
    assert {"spain-2026", "madrid-2026"}.issubset(set(spain["linked_race_ids"]))
    assert "manual_location_curated" in madrid["source_refs"]


def test_f1_knowledge_bundle_links_teams_constructors_drivers_and_technical_staff():
    bundle = build_f1_2026_knowledge_bundle()

    mclaren = next(entity for entity in _entities(bundle, "team") if entity["team_id"] == "mclaren")
    mclaren_constructor = next(
        entity for entity in _entities(bundle, "constructor") if entity["team_id"] == "mclaren"
    )
    mclaren_technical = next(
        entity for entity in _entities(bundle, "technical_team") if entity["team_id"] == "mclaren"
    )
    antonelli = next(entity for entity in _entities(bundle, "driver") if entity["driver_id"] == "antonelli")

    assert mclaren["driver_ids"] == ["norris", "piastri"]
    assert mclaren_constructor["chassis"] == "MCL40"
    assert mclaren_constructor["power_unit"] == "Mercedes"
    assert mclaren_technical["technical_chiefs"] == ["Peter Prodromou", "Neil Houldey"]
    assert antonelli["team_id"] == "mercedes"
    assert antonelli["useful_links"][0]["url"].endswith("/kimi-antonelli")


def test_prediction_brief_from_context_summarizes_race_circuit_and_location():
    context = {
        "race_id": "madrid-2026",
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "found": True,
        "summary": {
            "race": "Madrid Grand Prix",
            "date": "2026-09-13",
            "round_number": 16,
            "format": "classic",
            "circuit": "Circuito de Madrid",
            "location": "Madrid",
            "timezone": "Europe/Madrid",
            "visual": {"image_url": "/media/races/madrid.png", "url": "/media/races/madrid.png"},
            "image_url": "/media/races/madrid.png",
            "circuit_image_url": "/media/circuits/madrid.png",
        },
        "entities": [
            {
                "entity_type": "circuit",
                "circuit": {
                    "length_km": 5.474,
                    "turns": 16,
                    "laps": 56,
                    "venue_type": "hybrid_street_circuit",
                },
            },
            {
                "entity_type": "location",
                "location": {
                    "country": "Spain",
                    "address": "IFEMA Madrid / Valdebebas",
                },
            },
        ],
        "documents": [{"id": "f1_2026:doc:race:madrid-2026:profile"}],
        "useful_links": [],
    }

    brief = prediction_brief_from_context(context)

    assert brief["found"] is True
    assert brief["title"] == "Brief pronostic - Madrid Grand Prix"
    assert brief["image_url"] == "/media/races/madrid.png"
    assert brief["circuit_image_url"] == "/media/circuits/madrid.png"
    assert brief["source_document_ids"] == ["f1_2026:doc:race:madrid-2026:profile"]
    assert any(section["id"] == "prediction_focus" for section in brief["sections"])


def test_local_embedding_vector_is_deterministic_and_normalized():
    first = local_embedding_vector("Madrid circuit address IFEMA")
    second = local_embedding_vector("Madrid circuit address IFEMA")

    assert first == second
    assert len(first) == LOCAL_EMBEDDING_DIMENSIONS
    assert any(value != 0 for value in first)
    assert round(sum(value * value for value in first), 3) == 1.0


@pytest.mark.asyncio
async def test_update_knowledge_entity_accepts_admin_visual_metadata(monkeypatch):
    fake_db = _FakeKnowledgeDb(
        {
            "_id": "mongo-id",
            "id": "f1_2026:team:mclaren",
            "name": "McLaren",
            "entity_type": "team",
            "admin_locked_fields": ["name"],
        }
    )
    monkeypatch.setattr(knowledge_seed_service, "db", fake_db)

    entity = await knowledge_seed_service.update_knowledge_entity(
        "f1_2026:team:mclaren",
        {"visual": {"logo_url": "/api/admin-bo/media/media-1/file"}},
        actor="admin@pronokif.eu",
    )

    assert entity["visual"]["logo_url"] == "/api/admin-bo/media/media-1/file"
    assert fake_db.knowledge_entities.last_update is not None
    update = fake_db.knowledge_entities.last_update[1]["$set"]
    assert update["visual"] == {"logo_url": "/api/admin-bo/media/media-1/file"}
    assert "visual" in update["admin_locked_fields"]
    assert update["admin_managed"] is True


def test_team_brief_from_context_summarizes_drivers_and_technical_data():
    context = {
        "team_id": "mclaren",
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "found": True,
        "summary": {
            "team": "McLaren",
            "full_team_name": "McLaren Mastercard F1 Team",
            "visual": {"logo_url": "/media/teams/mclaren.png", "url": "/media/teams/mclaren.png"},
            "logo_url": "/media/teams/mclaren.png",
            "base": {"city": "Woking", "country": "United Kingdom"},
            "drivers": [
                {"name": "Lando Norris", "photo_url": "/media/drivers/norris.png"},
                {"name": "Oscar Piastri", "photo_url": "/media/drivers/piastri.png"},
            ],
            "chassis": "MCL40",
            "power_unit": "Mercedes",
            "team_chief": "Andrea Stella",
            "technical_chiefs": ["Peter Prodromou", "Neil Houldey"],
        },
        "documents": [{"id": "f1_2026:doc:team:mclaren:profile"}],
        "useful_links": [],
    }

    brief = team_brief_from_context(context)

    assert brief["title"] == "Brief ecurie - McLaren"
    assert brief["logo_url"] == "/media/teams/mclaren.png"
    assert "Lando Norris" in brief["sections"][1]["content"]
    assert "MCL40" in brief["sections"][2]["content"]


def test_driver_brief_from_context_summarizes_team_links():
    context = {
        "driver_id": "norris",
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "found": True,
        "summary": {
            "driver": "Lando Norris",
            "code": "NOR",
            "number": 1,
            "country": "Royaume-Uni",
            "visual": {"photo_url": "/media/drivers/norris.png", "url": "/media/drivers/norris.png"},
            "photo_url": "/media/drivers/norris.png",
            "team": "McLaren",
            "team_logo_url": "/media/teams/mclaren.png",
            "chassis": "MCL40",
            "power_unit": "Mercedes",
        },
        "documents": [{"id": "f1_2026:doc:driver:norris:profile"}],
        "useful_links": [],
    }

    brief = driver_brief_from_context(context)

    assert brief["title"] == "Brief pilote - Lando Norris"
    assert brief["photo_url"] == "/media/drivers/norris.png"
    assert brief["team_logo_url"] == "/media/teams/mclaren.png"
    assert "NOR" in brief["sections"][0]["content"]
    assert "McLaren" in brief["sections"][1]["content"]
