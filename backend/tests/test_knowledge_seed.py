from services.championships import F1_2026_CHAMPIONSHIP_ID
from services.knowledge_seed import (
    LOCAL_EMBEDDING_DIMENSIONS,
    build_f1_2026_knowledge_bundle,
    driver_brief_from_context,
    local_embedding_vector,
    prediction_brief_from_context,
    team_brief_from_context,
)


def _entities(bundle: dict, entity_type: str) -> list[dict]:
    return [entity for entity in bundle["entities"] if entity["entity_type"] == entity_type]


def test_f1_knowledge_bundle_links_core_entity_types():
    bundle = build_f1_2026_knowledge_bundle()

    assert bundle["summary"]["sources"] == 14
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


def test_f1_knowledge_bundle_enriches_circuits_locations_and_countries():
    bundle = build_f1_2026_knowledge_bundle()

    madrid = next(entity for entity in _entities(bundle, "circuit") if entity["canonical_key"] == "Madrid")
    monaco = next(entity for entity in _entities(bundle, "circuit") if entity["canonical_key"] == "Monaco")
    madrid_location = next(entity for entity in bundle["entities"] if entity["id"] == madrid["location_id"])
    spain = next(entity for entity in _entities(bundle, "country") if entity["country_code"] == "ES")

    assert madrid["circuit"]["venue_type"] == "hybrid_street_circuit"
    assert madrid["circuit"]["map_status"] == "static_fallback"
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
    assert brief["source_document_ids"] == ["f1_2026:doc:race:madrid-2026:profile"]
    assert any(section["id"] == "prediction_focus" for section in brief["sections"])


def test_local_embedding_vector_is_deterministic_and_normalized():
    first = local_embedding_vector("Madrid circuit address IFEMA")
    second = local_embedding_vector("Madrid circuit address IFEMA")

    assert first == second
    assert len(first) == LOCAL_EMBEDDING_DIMENSIONS
    assert any(value != 0 for value in first)
    assert round(sum(value * value for value in first), 3) == 1.0


def test_team_brief_from_context_summarizes_drivers_and_technical_data():
    context = {
        "team_id": "mclaren",
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "found": True,
        "summary": {
            "team": "McLaren",
            "full_team_name": "McLaren Mastercard F1 Team",
            "base": {"city": "Woking", "country": "United Kingdom"},
            "drivers": [{"name": "Lando Norris"}, {"name": "Oscar Piastri"}],
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
            "team": "McLaren",
            "chassis": "MCL40",
            "power_unit": "Mercedes",
        },
        "documents": [{"id": "f1_2026:doc:driver:norris:profile"}],
        "useful_links": [],
    }

    brief = driver_brief_from_context(context)

    assert brief["title"] == "Brief pilote - Lando Norris"
    assert "NOR" in brief["sections"][0]["content"]
    assert "McLaren" in brief["sections"][1]["content"]
