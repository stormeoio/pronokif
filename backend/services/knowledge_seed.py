"""
F1 2026 knowledge base seed and lightweight retrieval helpers.

The first RAG layer is deliberately document-oriented: entities remain stable
and translation-ready, while generated documents can later receive embeddings
without changing the canonical race/team/driver data model.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from datetime import UTC, datetime
from hashlib import sha256
from math import log, sqrt
from typing import Any

from config import db
from data.circuit_maps import circuit_map_brief, get_circuit_image_url, get_circuit_map
from data.drivers_data import F1_DRIVERS_DETAILED_2026
from data.f1_data import F1_CIRCUITS, F1_DRIVERS_2026
from data.f1_knowledge import (
    CIRCUIT_LOCATION_PROFILES,
    F1_2026_KNOWLEDGE_NAMESPACE,
    F1_2026_SOURCE_REFS,
    RACE_LINK_SLUGS_2026,
    TEAM_PROFILES_2026,
)
from services.championships import (
    F1_2026_CHAMPIONSHIP_ID,
    F1_2026_CHAMPIONSHIP_SLUG,
    F1_2026_SEASON,
    ensure_f1_2026_championship,
    f1_2026_championship_from_races,
)
from services.race_calendar import active_2026_races

DEFAULT_SEARCH_LIMIT = 25
MAX_SEARCH_LIMIT = 100
LOCAL_EMBEDDING_DIMENSIONS = 256
LOCAL_EMBEDDING_MODEL = "pronokif-hash-embedding-v1"
VALID_SEARCH_MODES = {"hybrid", "lexical", "vector"}
ENTITY_ADMIN_EDITABLE_FIELDS = {
    "name",
    "name_translations",
    "data_status",
    "review_status",
    "admin_notes",
    "owner_admin_email",
    "claimed_at",
    "useful_links",
    "source_refs",
    "search_terms",
    "location",
    "circuit",
    "base",
}
DOCUMENT_ADMIN_EDITABLE_FIELDS = {
    "title",
    "title_translations",
    "content",
    "content_translations",
    "data_status",
    "review_status",
    "admin_notes",
    "owner_admin_email",
    "claimed_at",
    "source_refs",
    "related_entity_ids",
}
DOCUMENT_EMBEDDING_FIELDS = {
    "title",
    "title_translations",
    "content",
    "content_translations",
    "source_refs",
    "related_entity_ids",
}

TEAM_NAME_TO_ID = {
    "Alpine": "alpine",
    "Aston Martin": "aston-martin",
    "Audi": "audi",
    "Cadillac": "cadillac",
    "Ferrari": "ferrari",
    "Haas": "haas",
    "Haas F1 Team": "haas",
    "McLaren": "mclaren",
    "Mercedes": "mercedes",
    "Racing Bulls": "racing-bulls",
    "Red Bull Racing": "red-bull-racing",
    "Williams": "williams",
}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or "unknown"


def _entity_id(entity_type: str, key: str) -> str:
    return f"{F1_2026_KNOWLEDGE_NAMESPACE}:{entity_type}:{_slug(key)}"


def _f1_race_url(race_id: str) -> str | None:
    slug = RACE_LINK_SLUGS_2026.get(race_id)
    if not slug:
        return None
    return f"https://www.formula1.com/en/racing/2026/{slug}"


def _f1_team_url(team_id: str) -> str:
    profile = TEAM_PROFILES_2026[team_id]
    return f"https://www.formula1.com/en/teams/{profile['f1_slug']}"


def _compact(values: list[Any]) -> list[str]:
    return [str(value).strip() for value in values if str(value or "").strip()]


def _search_text(*parts: Any) -> str:
    flattened: list[str] = []
    for part in parts:
        if part is None:
            continue
        if isinstance(part, dict):
            flattened.extend(_search_text(*part.values()).split(" "))
        elif isinstance(part, (list, tuple, set)):
            flattened.extend(_search_text(*part).split(" "))
        else:
            flattened.append(str(part))
    return " ".join(_compact(flattened))


def _without_mongo_id(document: dict[str, Any] | None) -> dict[str, Any]:
    return {key: value for key, value in (document or {}).items() if key != "_id"}


def _locked_fields(document: dict[str, Any] | None) -> set[str]:
    fields = (document or {}).get("admin_locked_fields") or []
    return {str(field) for field in fields if str(field or "").strip()}


def _document_search_text(document: dict[str, Any]) -> str:
    return _search_text(
        document.get("title"),
        document.get("title_translations"),
        document.get("content"),
        document.get("content_translations"),
        document.get("source_refs"),
        document.get("related_entity_ids"),
    )


def _pending_embedding(actor: str | None, now: str) -> dict[str, Any]:
    return {
        "status": "pending",
        "model": None,
        "dimensions": LOCAL_EMBEDDING_DIMENSIONS,
        "vector": None,
        "updated_at": now,
        "updated_by": actor,
    }


def _tokenize(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKD", text.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.findall(r"[a-z0-9]{2,}", ascii_value)


def local_embedding_vector(text: str, dimensions: int = LOCAL_EMBEDDING_DIMENSIONS) -> list[float]:
    """Return a deterministic feature-hash vector for local/dev retrieval."""
    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * dimensions

    counts: dict[str, int] = defaultdict(int)
    for token in tokens:
        counts[token] += 1

    vector = [0.0] * dimensions
    for token, count in counts.items():
        digest = sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign * (1.0 + log(count))

    norm = sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [round(value / norm, 6) for value in vector]


def _cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    return sum(a * b for a, b in zip(left, right, strict=True))


def _link(label: str, url: str | None, link_type: str) -> dict[str, str | None]:
    return {"label": label, "url": url, "type": link_type}


def _name_translations(name: str) -> dict[str, str]:
    return {"fr": name, "en": name}


def _base_entity(entity_type: str, key: str, name: str) -> dict[str, Any]:
    return {
        "id": _entity_id(entity_type, key),
        "namespace": F1_2026_KNOWLEDGE_NAMESPACE,
        "entity_type": entity_type,
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "championship_ids": [F1_2026_CHAMPIONSHIP_ID],
        "season": F1_2026_SEASON,
        "name": name,
        "name_translations": _name_translations(name),
        "canonical_key": key,
    }


def _doc_id(entity_type: str, key: str, suffix: str = "profile") -> str:
    return f"{F1_2026_KNOWLEDGE_NAMESPACE}:doc:{entity_type}:{_slug(key)}:{suffix}"


def _document(
    *,
    entity: dict[str, Any],
    title: str,
    content: str,
    source_refs: list[str],
    related_entity_ids: list[str] | None = None,
    suffix: str = "profile",
) -> dict[str, Any]:
    doc = {
        "id": _doc_id(entity["entity_type"], entity["canonical_key"], suffix),
        "namespace": F1_2026_KNOWLEDGE_NAMESPACE,
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "season": F1_2026_SEASON,
        "entity_id": entity["id"],
        "entity_type": entity["entity_type"],
        "title": title,
        "title_translations": {"fr": title},
        "locale": "fr",
        "content": content,
        "content_translations": {"fr": content},
        "source_refs": source_refs,
        "related_entity_ids": related_entity_ids or [],
        "chunking": {"strategy": "entity_profile_v1", "chunk_index": 0, "chunk_count": 1},
        "embedding": {"status": "pending", "model": None, "vector": None, "updated_at": None},
        "data_status": entity.get("data_status", "seeded"),
    }
    doc["search_text"] = _document_search_text(doc)
    return doc


def _build_sources() -> list[dict[str, Any]]:
    sources = [dict(source) for source in F1_2026_SOURCE_REFS.values()]
    for team_id, profile in TEAM_PROFILES_2026.items():
        sources.append(
            {
                "id": f"formula1_team_{team_id}",
                "namespace": F1_2026_KNOWLEDGE_NAMESPACE,
                "title": f"Formula 1 official team profile - {profile['display_name']}",
                "url": _f1_team_url(team_id),
                "publisher": "Formula One World Championship Limited",
                "source_type": "official_team_profile",
                "freshness": "verified_2026-05-29",
                "notes": "Official Formula 1 team profile consulted on 2026-05-29.",
            }
        )
    return sources


def _build_championship_entities(
    races: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build the canonical championship and season nodes for the RAG graph."""
    championship = f1_2026_championship_from_races(races)
    active_races = [race for race in races if not race.get("is_cancelled")]
    cancelled_races = [race for race in races if race.get("is_cancelled")]
    sprint_races = [race for race in active_races if race.get("is_sprint")]
    race_ids = [race["id"] for race in races]
    active_race_ids = [race["id"] for race in active_races]
    cancelled_race_ids = [race["id"] for race in cancelled_races]
    sprint_race_ids = [race["id"] for race in sprint_races]

    championship_entity = {
        **_base_entity("championship", F1_2026_CHAMPIONSHIP_ID, championship["name"]),
        "championship_record_id": F1_2026_CHAMPIONSHIP_ID,
        "slug": F1_2026_CHAMPIONSHIP_SLUG,
        "series": championship["series"],
        "is_active": championship["is_active"],
        "name_translations": championship["name_translations"],
        "description": championship["description"],
        "description_translations": championship["description_translations"],
        "linked_race_ids": race_ids,
        "active_race_ids": active_race_ids,
        "cancelled_race_ids": cancelled_race_ids,
        "sprint_race_ids": sprint_race_ids,
        "races_count": len(race_ids),
        "active_races_count": len(active_race_ids),
        "cancelled_races_count": len(cancelled_race_ids),
        "sprint_races_count": len(sprint_race_ids),
        "useful_links": [
            _link(
                "Formula 1 2026 calendar",
                F1_2026_SOURCE_REFS["formula1_calendar_2026"]["url"],
                "formula1_calendar",
            )
        ],
        "relations": [
            {
                "relation": "has_season",
                "target_entity_id": _entity_id("season", str(F1_2026_SEASON)),
            },
        ],
        "source_refs": ["formula1_calendar_2026"],
        "data_status": "seeded",
    }
    championship_entity["search_terms"] = _compact(
        [
            F1_2026_CHAMPIONSHIP_ID,
            F1_2026_CHAMPIONSHIP_SLUG,
            championship["name"],
            championship["name_translations"].get("fr"),
            championship["name_translations"].get("en"),
            championship["series"],
            F1_2026_SEASON,
            "f1",
            "formula 1",
            "formule 1",
        ]
    )
    championship_entity["search_text"] = _search_text(championship_entity)

    season_entity = {
        **_base_entity("season", str(F1_2026_SEASON), str(F1_2026_SEASON)),
        "year": F1_2026_SEASON,
        "series": championship["series"],
        "championship_record_id": F1_2026_CHAMPIONSHIP_ID,
        "linked_championship_ids": [championship_entity["id"]],
        "linked_race_ids": race_ids,
        "active_race_ids": active_race_ids,
        "cancelled_race_ids": cancelled_race_ids,
        "sprint_race_ids": sprint_race_ids,
        "races_count": len(race_ids),
        "active_races_count": len(active_race_ids),
        "cancelled_races_count": len(cancelled_race_ids),
        "sprint_races_count": len(sprint_race_ids),
        "relations": [
            {"relation": "season_of", "target_entity_id": championship_entity["id"]},
        ],
        "source_refs": ["formula1_calendar_2026"],
        "data_status": "seeded",
    }
    season_entity["name_translations"] = {"fr": "Saison 2026", "en": "2026 season"}
    season_entity["search_terms"] = _compact(
        [
            "2026",
            "saison 2026",
            "season 2026",
            "calendrier 2026",
            championship["name"],
            championship["name_translations"].get("fr"),
        ]
    )
    season_entity["search_text"] = _search_text(season_entity)

    championship_content = (
        f"{championship['name_translations']['fr']} est le championnat canonique PronoKif pour "
        f"la saison {F1_2026_SEASON}. Il regroupe {len(race_ids)} courses projet, "
        f"dont {len(active_race_ids)} actives, {len(cancelled_race_ids)} annulees conservees "
        f"pour audit, et {len(sprint_race_ids)} week-ends sprint."
    )
    season_content = (
        f"La saison {F1_2026_SEASON} rattache le calendrier F1, les courses, pronostics, "
        f"classements, briefs RAG et statistiques utilisateurs au championnat "
        f"{F1_2026_CHAMPIONSHIP_ID}."
    )

    documents = [
        _document(
            entity=championship_entity,
            title="Championnat F1 2026 - Synthese",
            content=championship_content,
            source_refs=championship_entity["source_refs"],
            related_entity_ids=[season_entity["id"]],
        ),
        _document(
            entity=season_entity,
            title="Saison F1 2026 - Synthese",
            content=season_content,
            source_refs=season_entity["source_refs"],
            related_entity_ids=[championship_entity["id"]],
        ),
    ]
    return [championship_entity, season_entity], documents


def _race_status_label(race: dict) -> str:
    if race.get("is_cancelled"):
        return "cancelled"
    return "active"


def _build_country_location_circuit_entities(
    races: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    entities: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    race_ids_by_country: dict[str, set[str]] = defaultdict(set)
    circuit_ids_by_country: dict[str, set[str]] = defaultdict(set)
    location_ids_by_country: dict[str, set[str]] = defaultdict(set)
    races_by_circuit: dict[str, list[dict[str, Any]]] = defaultdict(list)
    championship_entity_id = _entity_id("championship", F1_2026_CHAMPIONSHIP_ID)
    season_entity_id = _entity_id("season", str(F1_2026_SEASON))

    for race in races:
        races_by_circuit[race["circuit"]].append(race)

    for circuit_key, circuit_races in races_by_circuit.items():
        profile = CIRCUIT_LOCATION_PROFILES.get(circuit_key, {})
        circuit = F1_CIRCUITS.get(circuit_key, {})
        circuit_map = get_circuit_map(circuit_key)
        primary_race = circuit_races[0]
        location_key = f"{profile.get('city', primary_race.get('country'))}-{profile.get('country_code', '')}"
        country_code = profile.get("country_code") or _slug(primary_race.get("country", ""))[:2].upper()
        country_name = profile.get("country") or primary_race.get("country") or "Unknown"

        address_status = str(profile.get("address_status", ""))
        location_entity = {
            **_base_entity("location", location_key, str(profile.get("city") or circuit_key)),
            "location": {
                "city": profile.get("city"),
                "region": profile.get("region"),
                "country": country_name,
                "country_code": country_code,
                "address": profile.get("address"),
                "address_status": profile.get("address_status", "needs_review"),
                "timezone": primary_race.get("timezone"),
            },
            "linked_race_ids": [race["id"] for race in circuit_races],
            "linked_circuit_ids": [_entity_id("circuit", circuit_key)],
            "source_refs": ["formula1_calendar_2026", "manual_location_curated"],
            "data_status": (
                "partial_review_needed"
                if "pending" in address_status or "approximate" in address_status
                else "seeded"
            ),
        }
        location_entity["search_terms"] = _compact(
            [
                location_entity["name"],
                profile.get("city"),
                profile.get("region"),
                country_name,
                profile.get("address"),
                *profile.get("aliases", []),
            ]
        )
        location_entity["search_text"] = _search_text(location_entity)
        entities.append(location_entity)

        country_entity_id = _entity_id("country", country_code)
        race_ids_by_country[country_code].update(race["id"] for race in circuit_races)
        circuit_ids_by_country[country_code].add(_entity_id("circuit", circuit_key))
        location_ids_by_country[country_code].add(location_entity["id"])

        f1_links = [
            _link(race["name"], _f1_race_url(race["id"]), "formula1_race")
            for race in circuit_races
        ]
        useful_links = [
            *f1_links,
            _link("Official venue website", profile.get("official_site"), "official_venue"),
        ]
        useful_links = [link for link in useful_links if link.get("url")]

        circuit_name = circuit.get("full_name") or circuit_key
        circuit_entity = {
            **_base_entity("circuit", circuit_key, circuit_name),
            "aliases": profile.get("aliases", []),
            "location_id": location_entity["id"],
            "country_id": country_entity_id,
            "linked_race_ids": [race["id"] for race in circuit_races],
            "calendar_status": (
                "cancelled_only"
                if all(race.get("is_cancelled") for race in circuit_races)
                else "active"
            ),
            "circuit": {
                "short_name": circuit_key,
                "full_name": circuit_name,
                "length_km": circuit.get("length_km"),
                "turns": circuit.get("turns"),
                "laps": circuit.get("laps"),
                "venue_type": profile.get("venue_type"),
                "map_status": "interactive_seeded" if circuit_map else "static_fallback",
                "map_image_url": get_circuit_image_url(circuit_key),
                "interactive_map": circuit_map,
            },
            "location": location_entity["location"],
            "useful_links": useful_links,
            "relations": [
                {"relation": "located_in", "target_entity_id": location_entity["id"]},
                {"relation": "country", "target_entity_id": country_entity_id},
            ],
            "source_refs": ["formula1_calendar_2026", "manual_location_curated"],
            "data_status": location_entity["data_status"],
        }
        circuit_entity["search_terms"] = _compact(
            [
                circuit_key,
                circuit_name,
                *profile.get("aliases", []),
                profile.get("city"),
                country_name,
                profile.get("address"),
            ]
        )
        circuit_entity["search_text"] = _search_text(circuit_entity)
        entities.append(circuit_entity)

        status_text = (
            "annule au calendrier projet"
            if circuit_entity["calendar_status"] == "cancelled_only"
            else "actif"
        )
        circuit_content = (
            f"{circuit_name} ({circuit_key}) est le circuit lie au championnat F1 2026 "
            f"pour {', '.join(race['name'] for race in circuit_races)}. "
            f"Statut calendrier: {status_text}. Lieu: {profile.get('city')}, {country_name}. "
            f"Adresse: {profile.get('address') or 'a verifier'}. "
            f"Profil piste: {circuit.get('length_km')} km, {circuit.get('turns')} virages, "
            f"{circuit.get('laps')} tours en configuration Grand Prix."
        )
        map_brief = circuit_map_brief(circuit_map)
        if map_brief:
            circuit_content = f"{circuit_content} {map_brief}"
        documents.append(
            _document(
                entity=circuit_entity,
                title=f"Circuit F1 2026 - {circuit_name}",
                content=circuit_content,
                source_refs=circuit_entity["source_refs"],
                related_entity_ids=[location_entity["id"], country_entity_id],
            )
        )

        location_content = (
            f"{location_entity['name']} est le lieu de reference pour {circuit_name}. "
            f"Pays: {country_name}. Region: {profile.get('region') or 'n/a'}. "
            f"Adresse seed: {profile.get('address') or 'a verifier'} "
            f"({profile.get('address_status') or 'needs_review'})."
        )
        documents.append(
            _document(
                entity=location_entity,
                title=f"Lieu F1 2026 - {location_entity['name']}",
                content=location_content,
                source_refs=location_entity["source_refs"],
                related_entity_ids=[circuit_entity["id"], country_entity_id],
            )
        )

        for race in circuit_races:
            race_entity = {
                **_base_entity("race", race["id"], race["name"]),
                "race_id": race["id"],
                "round_number": race.get("round_number"),
                "date": race.get("date"),
                "timezone": race.get("timezone"),
                "is_sprint": bool(race.get("is_sprint")),
                "calendar_status": _race_status_label(race),
                "circuit_id": circuit_entity["id"],
                "location_id": location_entity["id"],
                "country_id": country_entity_id,
                "useful_links": [_link("Formula 1 race page", _f1_race_url(race["id"]), "formula1_race")],
                "relations": [
                    {"relation": "uses_circuit", "target_entity_id": circuit_entity["id"]},
                    {"relation": "takes_place_at", "target_entity_id": location_entity["id"]},
                    {"relation": "country", "target_entity_id": country_entity_id},
                    {"relation": "part_of_championship", "target_entity_id": championship_entity_id},
                    {"relation": "part_of_season", "target_entity_id": season_entity_id},
                ],
                "source_refs": ["formula1_calendar_2026"],
                "data_status": "seeded" if not race.get("is_cancelled") else "project_cancelled_event",
            }
            race_entity["search_terms"] = _compact(
                [
                    race["id"],
                    race["name"],
                    race.get("country"),
                    circuit_name,
                    profile.get("city"),
                    "sprint" if race.get("is_sprint") else "grand prix",
                ]
            )
            race_entity["search_text"] = _search_text(race_entity)
            entities.append(race_entity)

            race_content = (
                f"{race['name']} est la manche {race.get('round_number')} du championnat F1 2026 "
                f"liee a {circuit_name}, {profile.get('city')}, {country_name}. "
                f"Date de course: {race.get('date')}. Fuseau local: {race.get('timezone')}. "
                f"Format: {'week-end sprint' if race.get('is_sprint') else 'Grand Prix classique'}. "
                f"Statut: {race_entity['calendar_status']}."
            )
            documents.append(
                _document(
                    entity=race_entity,
                    title=f"Course F1 2026 - {race['name']}",
                    content=race_content,
                    source_refs=race_entity["source_refs"],
                    related_entity_ids=[
                        circuit_entity["id"],
                        location_entity["id"],
                        country_entity_id,
                        championship_entity_id,
                        season_entity_id,
                    ],
                )
            )

    for country_code, race_ids in race_ids_by_country.items():
        sample_location_id = next(iter(location_ids_by_country[country_code]))
        sample_location = next(entity for entity in entities if entity["id"] == sample_location_id)
        country_name = sample_location["location"]["country"]
        country_entity = {
            **_base_entity("country", country_code, country_name),
            "country_code": country_code,
            "linked_race_ids": sorted(race_ids),
            "linked_circuit_ids": sorted(circuit_ids_by_country[country_code]),
            "linked_location_ids": sorted(location_ids_by_country[country_code]),
            "source_refs": ["formula1_calendar_2026", "manual_location_curated"],
            "data_status": "seeded",
        }
        country_entity["search_terms"] = _compact([country_code, country_name])
        country_entity["search_text"] = _search_text(country_entity)
        entities.append(country_entity)

    return entities, documents


def _build_team_driver_entities() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    entities: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    drivers_by_team: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for driver in F1_DRIVERS_2026:
        team_id = TEAM_NAME_TO_ID.get(driver["team"], _slug(driver["team"]))
        drivers_by_team[team_id].append(driver)

    for team_id, profile in TEAM_PROFILES_2026.items():
        driver_names = [driver["name"] for driver in drivers_by_team.get(team_id, [])]
        source_refs = ["formula1_teams_2026", f"formula1_team_{team_id}"]
        team_entity = {
            **_base_entity("team", team_id, profile["display_name"]),
            "team_id": team_id,
            "display_name": profile["display_name"],
            "full_team_name": profile["full_team_name"],
            "base": profile["base"],
            "drivers": drivers_by_team.get(team_id, []),
            "driver_ids": [driver["id"] for driver in drivers_by_team.get(team_id, [])],
            "constructor_id": _entity_id("constructor", team_id),
            "technical_team_id": _entity_id("technical_team", team_id),
            "useful_links": [_link("Formula 1 team profile", _f1_team_url(team_id), "formula1_team")],
            "relations": [
                {"relation": "has_constructor", "target_entity_id": _entity_id("constructor", team_id)},
                {"relation": "has_technical_team", "target_entity_id": _entity_id("technical_team", team_id)},
            ],
            "source_refs": source_refs,
            "data_status": "official_profile_seeded",
        }
        team_entity["search_terms"] = _compact(
            [
                profile["display_name"],
                profile["full_team_name"],
                profile["base"].get("city"),
                profile["base"].get("country"),
                profile.get("team_chief"),
                *profile.get("technical_chiefs", []),
                *driver_names,
            ]
        )
        team_entity["search_text"] = _search_text(team_entity)
        entities.append(team_entity)

        constructor_entity = {
            **_base_entity("constructor", team_id, profile["display_name"]),
            "team_id": team_id,
            "team_entity_id": team_entity["id"],
            "full_team_name": profile["full_team_name"],
            "chassis": profile["chassis"],
            "power_unit": profile["power_unit"],
            "base": profile["base"],
            "source_refs": source_refs,
            "data_status": "official_profile_seeded",
            "relations": [{"relation": "belongs_to_team", "target_entity_id": team_entity["id"]}],
        }
        constructor_entity["search_terms"] = _compact(
            [profile["display_name"], profile["full_team_name"], profile["chassis"], profile["power_unit"]]
        )
        constructor_entity["search_text"] = _search_text(constructor_entity)
        entities.append(constructor_entity)

        technical_entity = {
            **_base_entity("technical_team", team_id, f"Equipe technique {profile['display_name']}"),
            "team_id": team_id,
            "team_entity_id": team_entity["id"],
            "team_chief": profile["team_chief"],
            "technical_chiefs": profile["technical_chiefs"],
            "chassis": profile["chassis"],
            "power_unit": profile["power_unit"],
            "reserve_drivers": profile["reserve_drivers"],
            "base": profile["base"],
            "source_refs": source_refs,
            "data_status": "official_profile_seeded",
            "relations": [{"relation": "supports_team", "target_entity_id": team_entity["id"]}],
        }
        technical_entity["search_terms"] = _compact(
            [
                technical_entity["name"],
                profile["display_name"],
                profile["team_chief"],
                *profile["technical_chiefs"],
                profile["chassis"],
                profile["power_unit"],
            ]
        )
        technical_entity["search_text"] = _search_text(technical_entity)
        entities.append(technical_entity)

        team_content = (
            f"{profile['display_name']} court en F1 2026 sous le nom {profile['full_team_name']}. "
            f"Base: {profile['base']['city']}, {profile['base']['country']}. "
            f"Pilotes: {', '.join(driver_names) or 'a confirmer'}. "
            f"Chassis: {profile['chassis']}. Groupe propulseur: {profile['power_unit']}."
        )
        documents.append(
            _document(
                entity=team_entity,
                title=f"Ecurie F1 2026 - {profile['display_name']}",
                content=team_content,
                source_refs=source_refs,
                related_entity_ids=[constructor_entity["id"], technical_entity["id"]],
            )
        )

        technical_content = (
            f"L'equipe technique {profile['display_name']} est basee a {profile['base']['city']}. "
            f"Direction: {profile['team_chief']}. "
            f"Responsable(s) technique(s): {', '.join(profile['technical_chiefs']) or 'a confirmer'}. "
            f"Chassis {profile['chassis']}, power unit {profile['power_unit']}."
        )
        documents.append(
            _document(
                entity=technical_entity,
                title=f"Equipe technique F1 2026 - {profile['display_name']}",
                content=technical_content,
                source_refs=source_refs,
                related_entity_ids=[team_entity["id"], constructor_entity["id"]],
            )
        )

        constructor_content = (
            f"Le constructeur {profile['display_name']} est lie a {profile['full_team_name']} "
            f"pour la saison F1 2026. Chassis: {profile['chassis']}. "
            f"Groupe propulseur: {profile['power_unit']}."
        )
        documents.append(
            _document(
                entity=constructor_entity,
                title=f"Constructeur F1 2026 - {profile['display_name']}",
                content=constructor_content,
                source_refs=source_refs,
                related_entity_ids=[team_entity["id"], technical_entity["id"]],
            )
        )

    for driver in F1_DRIVERS_2026:
        team_id = TEAM_NAME_TO_ID.get(driver["team"], _slug(driver["team"]))
        detail = F1_DRIVERS_DETAILED_2026.get(driver["id"], {})
        team_profile = TEAM_PROFILES_2026.get(team_id, {})
        driver_name = detail.get("full_name") or driver["name"]
        source_refs = ["formula1_teams_2026", f"formula1_team_{team_id}"]
        driver_entity = {
            **_base_entity("driver", driver["id"], driver_name),
            "driver_id": driver["id"],
            "code": driver.get("code"),
            "number": driver.get("number"),
            "country_code": driver.get("country"),
            "country_name": detail.get("country_name"),
            "date_of_birth": detail.get("date_of_birth"),
            "place_of_birth": detail.get("place_of_birth"),
            "team_id": team_id,
            "team_entity_id": _entity_id("team", team_id),
            "constructor_entity_id": _entity_id("constructor", team_id),
            "useful_links": [
                _link(
                    "Formula 1 driver profile",
                    f"https://www.formula1.com/en/drivers/{_slug(driver['name'])}",
                    "formula1_driver",
                )
            ],
            "relations": [
                {"relation": "drives_for", "target_entity_id": _entity_id("team", team_id)},
                {"relation": "uses_constructor", "target_entity_id": _entity_id("constructor", team_id)},
            ],
            "source_refs": source_refs,
            "data_status": "official_lineup_seeded",
        }
        driver_entity["search_terms"] = _compact(
            [
                driver_name,
                driver.get("code"),
                driver.get("number"),
                driver.get("country"),
                detail.get("country_name"),
                detail.get("place_of_birth"),
                team_profile.get("display_name") or driver.get("team"),
            ]
        )
        driver_entity["search_text"] = _search_text(driver_entity)
        entities.append(driver_entity)

        driver_content = (
            f"{driver_name} ({driver.get('code')}, numero {driver.get('number')}) est pilote "
            f"{team_profile.get('display_name') or driver.get('team')} pour la saison F1 2026. "
            f"Nationalite: {detail.get('country_name') or driver.get('country')}. "
            f"Lien entite: equipe {team_id}, constructeur {team_id}."
        )
        documents.append(
            _document(
                entity=driver_entity,
                title=f"Pilote F1 2026 - {driver_name}",
                content=driver_content,
                source_refs=source_refs,
                related_entity_ids=[_entity_id("team", team_id), _entity_id("constructor", team_id)],
            )
        )

    return entities, documents


def build_f1_2026_knowledge_bundle(races: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Build deterministic source/entity/document payloads for the F1 2026 KB."""
    resolved_races = races or active_2026_races()
    sources = _build_sources()
    championship_entities, championship_documents = _build_championship_entities(resolved_races)
    geo_entities, geo_documents = _build_country_location_circuit_entities(resolved_races)
    team_entities, team_documents = _build_team_driver_entities()
    entities = championship_entities + geo_entities + team_entities
    documents = championship_documents + geo_documents + team_documents
    summary = {
        "sources": len(sources),
        "entities": len(entities),
        "documents": len(documents),
        "entity_types": dict(
            sorted(
                {
                    entity_type: len([entity for entity in entities if entity["entity_type"] == entity_type])
                    for entity_type in {entity["entity_type"] for entity in entities}
                }.items()
            )
        ),
    }
    return {"sources": sources, "entities": entities, "documents": documents, "summary": summary}


async def _upsert_many(collection_name: str, documents: list[dict[str, Any]], actor: str | None) -> dict[str, int]:
    collection = getattr(db, collection_name)
    now = _now_iso()
    inserted = 0
    updated = 0
    for document in documents:
        existing = await collection.find_one({"id": document["id"]}, {"_id": 0})
        locked_fields = _locked_fields(existing)
        payload = {
            **document,
            "updated_at": now,
            "updated_by": actor,
        }
        if existing and locked_fields:
            for field in locked_fields:
                if field in existing:
                    payload[field] = existing[field]
            payload["admin_managed"] = True
            payload["admin_locked_fields"] = sorted(locked_fields)
            if collection_name == "knowledge_documents":
                payload["search_text"] = _document_search_text(payload)
                if existing.get("embedding"):
                    payload["embedding"] = existing["embedding"]
            else:
                payload["search_text"] = _search_text(_without_mongo_id(payload))
        result = await collection.update_one(
            {"id": document["id"]},
            {
                "$set": payload,
                "$setOnInsert": {
                    "created_at": now,
                    "created_by": actor,
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1
    return {"inserted": inserted, "updated": updated, "total": len(documents)}


async def seed_f1_2026_knowledge(actor: str | None = None) -> dict[str, Any]:
    """Upsert F1 2026 knowledge sources, entities and RAG documents."""
    races = active_2026_races()
    await ensure_f1_2026_championship(races=races, actor=actor)
    bundle = build_f1_2026_knowledge_bundle(races)
    sources = await _upsert_many("knowledge_sources", bundle["sources"], actor)
    entities = await _upsert_many("knowledge_entities", bundle["entities"], actor)
    documents = await _upsert_many("knowledge_documents", bundle["documents"], actor)
    return {
        "namespace": F1_2026_KNOWLEDGE_NAMESPACE,
        "championship_id": F1_2026_CHAMPIONSHIP_ID,
        "sources": sources,
        "entities": entities,
        "documents": documents,
        "summary": bundle["summary"],
    }


async def rebuild_knowledge_embeddings(
    *,
    namespace: str = F1_2026_KNOWLEDGE_NAMESPACE,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    entity_type: str | None = None,
    force: bool = False,
    limit: int | None = None,
    actor: str | None = None,
) -> dict[str, Any]:
    """Build deterministic local embeddings for pending knowledge documents."""
    query: dict[str, Any] = {"namespace": namespace}
    if championship_id:
        query["championship_id"] = championship_id
    if entity_type:
        query["entity_type"] = entity_type
    if not force:
        query["embedding.status"] = {"$ne": "ready"}

    resolved_limit = _limit(limit)
    documents = (
        await db.knowledge_documents.find(query, {"_id": 0})
        .sort([("entity_type", 1), ("title", 1)])
        .limit(resolved_limit)
        .to_list(resolved_limit)
    )

    now = _now_iso()
    updated = 0
    for document in documents:
        text = _search_text(document.get("title"), document.get("content"), document.get("search_text"))
        vector = local_embedding_vector(text)
        result = await db.knowledge_documents.update_one(
            {"id": document["id"]},
            {
                "$set": {
                    "embedding": {
                        "status": "ready",
                        "model": LOCAL_EMBEDDING_MODEL,
                        "dimensions": LOCAL_EMBEDDING_DIMENSIONS,
                        "vector": vector,
                        "updated_at": now,
                        "updated_by": actor,
                    },
                    "updated_at": now,
                    "updated_by": actor,
                }
            },
        )
        updated += result.modified_count

    remaining_query = dict(query)
    remaining_query["embedding.status"] = {"$ne": "ready"}
    return {
        "namespace": namespace,
        "championship_id": championship_id,
        "model": LOCAL_EMBEDDING_MODEL,
        "dimensions": LOCAL_EMBEDDING_DIMENSIONS,
        "matched": len(documents),
        "updated": updated,
        "remaining_pending": await db.knowledge_documents.count_documents(remaining_query),
    }


def _limit(limit: int | None) -> int:
    if limit is None:
        return DEFAULT_SEARCH_LIMIT
    return max(1, min(int(limit), MAX_SEARCH_LIMIT))


def _search_filter(query: str) -> dict[str, Any]:
    tokens = [token for token in re.split(r"\s+", query.strip()) if token]
    if not tokens:
        return {}
    return {
        "$and": [
            {"search_text": {"$regex": re.escape(token), "$options": "i"}}
            for token in tokens[:5]
        ]
    }


def _merge_query(base: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    if not extra:
        return base
    if not base:
        return extra
    return {"$and": [base, extra]}


async def list_knowledge_entities(
    *,
    namespace: str = F1_2026_KNOWLEDGE_NAMESPACE,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    entity_type: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int | None = None,
) -> dict[str, Any]:
    query: dict[str, Any] = {"namespace": namespace}
    if championship_id:
        query["championship_id"] = championship_id
    if entity_type:
        query["entity_type"] = entity_type
    query = _merge_query(query, _search_filter(q))
    resolved_limit = _limit(limit)
    total = await db.knowledge_entities.count_documents(query)
    entities = (
        await db.knowledge_entities.find(query, {"_id": 0})
        .sort([("entity_type", 1), ("name", 1)])
        .skip(skip)
        .limit(resolved_limit)
        .to_list(resolved_limit)
    )
    return {"entities": entities, "total": total, "skip": skip, "limit": resolved_limit}


async def list_knowledge_documents(
    *,
    namespace: str = F1_2026_KNOWLEDGE_NAMESPACE,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    entity_type: str | None = None,
    q: str = "",
    skip: int = 0,
    limit: int | None = None,
) -> dict[str, Any]:
    query: dict[str, Any] = {"namespace": namespace}
    if championship_id:
        query["championship_id"] = championship_id
    if entity_type:
        query["entity_type"] = entity_type
    query = _merge_query(query, _search_filter(q))
    resolved_limit = _limit(limit)
    total = await db.knowledge_documents.count_documents(query)
    documents = (
        await db.knowledge_documents.find(query, {"_id": 0})
        .sort([("entity_type", 1), ("title", 1)])
        .skip(skip)
        .limit(resolved_limit)
        .to_list(resolved_limit)
    )
    ready_query = _merge_query(query, {"embedding.status": "ready"})
    pending_query = _merge_query(query, {"embedding.status": {"$ne": "ready"}})
    return {
        "documents": documents,
        "total": total,
        "skip": skip,
        "limit": resolved_limit,
        "embedding_summary": {
            "ready": await db.knowledge_documents.count_documents(ready_query),
            "pending": await db.knowledge_documents.count_documents(pending_query),
            "model": LOCAL_EMBEDDING_MODEL,
            "dimensions": LOCAL_EMBEDDING_DIMENSIONS,
        },
    }


def _score_document(document: dict[str, Any], query: str) -> int:
    text = str(document.get("search_text", "")).lower()
    return sum(text.count(token.lower()) for token in re.split(r"\s+", query.strip()) if token)


def _vector_score(document: dict[str, Any], query_vector: list[float]) -> float:
    embedding = document.get("embedding") or {}
    if embedding.get("status") != "ready":
        return 0.0
    vector = embedding.get("vector")
    if not isinstance(vector, list):
        return 0.0
    return _cosine_similarity([float(value) for value in vector], query_vector)


async def search_knowledge(
    *,
    q: str,
    namespace: str = F1_2026_KNOWLEDGE_NAMESPACE,
    championship_id: str | None = F1_2026_CHAMPIONSHIP_ID,
    entity_type: str | None = None,
    limit: int | None = None,
    mode: str = "hybrid",
) -> dict[str, Any]:
    if not q.strip():
        return {"query": q, "mode": mode, "results": [], "total": 0}
    resolved_limit = _limit(limit)
    resolved_mode = mode if mode in VALID_SEARCH_MODES else "hybrid"
    query: dict[str, Any] = {"namespace": namespace}
    if championship_id:
        query["championship_id"] = championship_id
    if entity_type:
        query["entity_type"] = entity_type

    if resolved_mode == "lexical":
        query = _merge_query(query, _search_filter(q))

    candidates = (
        await db.knowledge_documents.find(query, {"_id": 0})
        .limit(max(resolved_limit * 8, 100))
        .to_list(max(resolved_limit * 8, 100))
    )
    query_vector = local_embedding_vector(q) if resolved_mode in {"hybrid", "vector"} else []

    ranked_candidates = []
    for document in candidates:
        lexical_score = _score_document(document, q)
        vector_score = _vector_score(document, query_vector) if query_vector else 0.0
        combined_score = {
            "lexical": float(lexical_score),
            "vector": round(vector_score, 6),
            "hybrid": round(float(lexical_score) + vector_score * 4, 6),
        }[resolved_mode]
        if combined_score > 0:
            ranked_candidates.append((combined_score, lexical_score, vector_score, document))

    ranked = [
        {
            **document,
            "retrieval_score": round(score, 6),
            "retrieval_scores": {
                "lexical": lexical_score,
                "vector": round(vector_score, 6),
            },
        }
        for score, lexical_score, vector_score, document in sorted(
            ranked_candidates,
            key=lambda item: (item[0], item[1], item[3].get("title", "")),
            reverse=True,
        )[:resolved_limit]
    ]
    return {"query": q, "mode": resolved_mode, "results": ranked, "total": len(ranked)}


async def get_knowledge_entity(entity_id: str) -> dict[str, Any] | None:
    """Fetch one knowledge entity by stable ID."""
    return await db.knowledge_entities.find_one({"id": entity_id}, {"_id": 0})


async def update_knowledge_entity(
    entity_id: str,
    updates: dict[str, Any],
    *,
    actor: str | None = None,
) -> dict[str, Any] | None:
    """Apply admin-owned edits to a knowledge entity and keep search fresh."""
    existing = await db.knowledge_entities.find_one({"id": entity_id})
    if not existing:
        return None

    payload = {key: value for key, value in updates.items() if key in ENTITY_ADMIN_EDITABLE_FIELDS}
    if not payload:
        return _without_mongo_id(existing)

    now = _now_iso()
    locked_fields = sorted(_locked_fields(existing) | set(payload.keys()))
    merged = {**_without_mongo_id(existing), **payload}
    payload.update(
        {
            "admin_managed": True,
            "admin_locked_fields": locked_fields,
            "search_text": _search_text(merged),
            "updated_at": now,
            "updated_by": actor,
        }
    )
    if payload.get("review_status") == "approved":
        payload["last_reviewed_at"] = now
        payload["last_reviewed_by"] = actor

    await db.knowledge_entities.update_one({"id": entity_id}, {"$set": payload})
    return await db.knowledge_entities.find_one({"id": entity_id}, {"_id": 0})


async def update_knowledge_document(
    document_id: str,
    updates: dict[str, Any],
    *,
    actor: str | None = None,
) -> dict[str, Any] | None:
    """Apply admin-owned edits to a RAG document and invalidate embeddings when needed."""
    existing = await db.knowledge_documents.find_one({"id": document_id})
    if not existing:
        return None

    payload = {key: value for key, value in updates.items() if key in DOCUMENT_ADMIN_EDITABLE_FIELDS}
    if not payload:
        return _without_mongo_id(existing)

    now = _now_iso()
    locked_fields = sorted(_locked_fields(existing) | set(payload.keys()))
    merged = {**_without_mongo_id(existing), **payload}
    payload.update(
        {
            "admin_managed": True,
            "admin_locked_fields": locked_fields,
            "search_text": _document_search_text(merged),
            "updated_at": now,
            "updated_by": actor,
        }
    )
    if DOCUMENT_EMBEDDING_FIELDS.intersection(payload.keys()):
        payload["embedding"] = _pending_embedding(actor, now)
    if payload.get("review_status") == "approved":
        payload["last_reviewed_at"] = now
        payload["last_reviewed_by"] = actor

    await db.knowledge_documents.update_one({"id": document_id}, {"$set": payload})
    return await db.knowledge_documents.find_one({"id": document_id}, {"_id": 0})


async def claim_knowledge_entity(
    entity_id: str,
    *,
    actor: str | None = None,
    owner_admin_email: str | None = None,
    review_status: str = "in_review",
) -> dict[str, Any] | None:
    """Assign an admin owner to a knowledge entity."""
    owner = owner_admin_email or actor
    updates = {
        "owner_admin_email": owner,
        "review_status": review_status,
        "claimed_at": _now_iso(),
    }
    return await update_knowledge_entity(entity_id, updates, actor=actor)


async def claim_knowledge_document(
    document_id: str,
    *,
    actor: str | None = None,
    owner_admin_email: str | None = None,
    review_status: str = "in_review",
) -> dict[str, Any] | None:
    """Assign an admin owner to a RAG document."""
    owner = owner_admin_email or actor
    updates = {
        "owner_admin_email": owner,
        "review_status": review_status,
        "claimed_at": _now_iso(),
    }
    return await update_knowledge_document(document_id, updates, actor=actor)


async def _entities_and_documents_for_ids(
    entity_ids: set[str],
    *,
    entity_limit: int = 40,
    document_limit: int = 60,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    resolved_ids = sorted(entity_id for entity_id in entity_ids if entity_id)
    if not resolved_ids:
        return [], []
    entities = await db.knowledge_entities.find(
        {"id": {"$in": resolved_ids}},
        {"_id": 0},
    ).sort([("entity_type", 1), ("name", 1)]).to_list(entity_limit)
    documents = await db.knowledge_documents.find(
        {"entity_id": {"$in": resolved_ids}},
        {"_id": 0},
    ).sort([("entity_type", 1), ("title", 1)]).to_list(document_limit)
    return entities, documents


def _entities_by_type(entities: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entity in entities:
        grouped[str(entity.get("entity_type"))].append(entity)
    return grouped


async def get_race_knowledge_context(
    *,
    race_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    """Return the RAG-ready entity graph around a race."""
    race_entity = await db.knowledge_entities.find_one(
        {
            "championship_id": championship_id,
            "entity_type": "race",
            "$or": [{"race_id": race_id}, {"canonical_key": race_id}],
        },
        {"_id": 0},
    )
    if not race_entity:
        return {
            "race_id": race_id,
            "championship_id": championship_id,
            "found": False,
            "entities": [],
            "documents": [],
            "summary": None,
        }

    related_ids = {
        race_entity["id"],
        race_entity.get("circuit_id"),
        race_entity.get("location_id"),
        race_entity.get("country_id"),
    }
    related_ids.update(
        relation.get("target_entity_id")
        for relation in race_entity.get("relations", [])
        if relation.get("target_entity_id")
    )
    related_ids = {entity_id for entity_id in related_ids if entity_id}

    entities, documents = await _entities_and_documents_for_ids(related_ids)
    entities_by_type = _entities_by_type(entities)

    circuit = (entities_by_type.get("circuit") or [None])[0]
    location = (entities_by_type.get("location") or [None])[0]
    summary = {
        "race": race_entity.get("name"),
        "date": race_entity.get("date"),
        "round_number": race_entity.get("round_number"),
        "format": "sprint" if race_entity.get("is_sprint") else "classic",
        "calendar_status": race_entity.get("calendar_status"),
        "circuit": circuit.get("name") if circuit else None,
        "location": location.get("name") if location else None,
        "country": (location or {}).get("location", {}).get("country"),
        "timezone": race_entity.get("timezone"),
    }
    return {
        "race_id": race_id,
        "championship_id": championship_id,
        "found": True,
        "summary": summary,
        "entities": entities,
        "documents": documents,
        "useful_links": race_entity.get("useful_links", []),
    }


async def get_team_knowledge_context(
    *,
    team_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    """Return the RAG-ready entity graph around one team."""
    team_entity = await db.knowledge_entities.find_one(
        {
            "championship_id": championship_id,
            "entity_type": "team",
            "$or": [{"team_id": team_id}, {"canonical_key": team_id}, {"id": team_id}],
        },
        {"_id": 0},
    )
    if not team_entity:
        return {
            "team_id": team_id,
            "championship_id": championship_id,
            "found": False,
            "entities": [],
            "documents": [],
            "summary": None,
        }

    driver_entities = await db.knowledge_entities.find(
        {
            "championship_id": championship_id,
            "entity_type": "driver",
            "team_id": team_entity.get("team_id"),
        },
        {"_id": 0},
    ).sort("name", 1).to_list(10)

    related_ids = {
        team_entity["id"],
        team_entity.get("constructor_id"),
        team_entity.get("technical_team_id"),
        *(driver.get("id") for driver in driver_entities),
    }
    related_ids.update(
        relation.get("target_entity_id")
        for relation in team_entity.get("relations", [])
        if relation.get("target_entity_id")
    )
    entities, documents = await _entities_and_documents_for_ids(related_ids)
    entities_by_type = _entities_by_type(entities)
    constructor = (entities_by_type.get("constructor") or [None])[0]
    technical_team = (entities_by_type.get("technical_team") or [None])[0]
    drivers = entities_by_type.get("driver") or []
    summary = {
        "team": team_entity.get("display_name") or team_entity.get("name"),
        "team_id": team_entity.get("team_id"),
        "full_team_name": team_entity.get("full_team_name"),
        "base": team_entity.get("base"),
        "drivers": [
            {
                "id": driver.get("driver_id"),
                "name": driver.get("name"),
                "code": driver.get("code"),
                "number": driver.get("number"),
            }
            for driver in drivers
        ],
        "chassis": (constructor or {}).get("chassis"),
        "power_unit": (constructor or {}).get("power_unit"),
        "team_chief": (technical_team or {}).get("team_chief"),
        "technical_chiefs": (technical_team or {}).get("technical_chiefs") or [],
    }
    return {
        "team_id": team_id,
        "championship_id": championship_id,
        "found": True,
        "summary": summary,
        "entities": entities,
        "documents": documents,
        "useful_links": team_entity.get("useful_links", []),
    }


async def get_driver_knowledge_context(
    *,
    driver_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    """Return the RAG-ready entity graph around one driver."""
    driver_entity = await db.knowledge_entities.find_one(
        {
            "championship_id": championship_id,
            "entity_type": "driver",
            "$or": [{"driver_id": driver_id}, {"canonical_key": driver_id}, {"code": driver_id.upper()}],
        },
        {"_id": 0},
    )
    if not driver_entity:
        return {
            "driver_id": driver_id,
            "championship_id": championship_id,
            "found": False,
            "entities": [],
            "documents": [],
            "summary": None,
        }

    team_entity = await db.knowledge_entities.find_one(
        {
            "championship_id": championship_id,
            "entity_type": "team",
            "team_id": driver_entity.get("team_id"),
        },
        {"_id": 0},
    )
    related_ids = {
        driver_entity["id"],
        driver_entity.get("team_entity_id"),
        driver_entity.get("constructor_entity_id"),
        (team_entity or {}).get("technical_team_id"),
    }
    related_ids.update(
        relation.get("target_entity_id")
        for relation in driver_entity.get("relations", [])
        if relation.get("target_entity_id")
    )
    entities, documents = await _entities_and_documents_for_ids(related_ids)
    entities_by_type = _entities_by_type(entities)
    team = (entities_by_type.get("team") or [None])[0]
    constructor = (entities_by_type.get("constructor") or [None])[0]
    technical_team = (entities_by_type.get("technical_team") or [None])[0]
    summary = {
        "driver": driver_entity.get("name"),
        "driver_id": driver_entity.get("driver_id"),
        "code": driver_entity.get("code"),
        "number": driver_entity.get("number"),
        "country": driver_entity.get("country_name") or driver_entity.get("country_code"),
        "team": (team or {}).get("display_name") or (team or {}).get("name"),
        "team_id": driver_entity.get("team_id"),
        "chassis": (constructor or {}).get("chassis"),
        "power_unit": (constructor or {}).get("power_unit"),
        "team_chief": (technical_team or {}).get("team_chief"),
    }
    return {
        "driver_id": driver_id,
        "championship_id": championship_id,
        "found": True,
        "summary": summary,
        "entities": entities,
        "documents": documents,
        "useful_links": driver_entity.get("useful_links", []),
    }


def prediction_brief_from_context(context: dict[str, Any]) -> dict[str, Any]:
    """Build a human and agent-friendly prediction brief from a race context."""
    if not context.get("found"):
        return {
            "race_id": context.get("race_id"),
            "found": False,
            "title": "Brief indisponible",
            "sections": [],
            "next_actions": ["Seeder la base RAG F1 2026 puis relancer le brief."],
        }

    summary = context["summary"] or {}
    entities_by_type = defaultdict(list)
    for entity in context.get("entities", []):
        entities_by_type[entity.get("entity_type")].append(entity)

    circuit = (entities_by_type.get("circuit") or [{}])[0]
    location = (entities_by_type.get("location") or [{}])[0]
    circuit_profile = circuit.get("circuit") or {}
    location_profile = location.get("location") or {}
    format_label = "week-end sprint" if summary.get("format") == "sprint" else "Grand Prix classique"

    sections = [
        {
            "id": "race",
            "title": "Course",
            "content": (
                f"{summary.get('race')} est la manche {summary.get('round_number')} "
                f"du championnat F1 2026. Date: {summary.get('date')}. Format: {format_label}."
            ),
        },
        {
            "id": "circuit",
            "title": "Circuit",
            "content": (
                f"{summary.get('circuit')} mesure {circuit_profile.get('length_km')} km, "
                f"avec {circuit_profile.get('turns')} virages et {circuit_profile.get('laps')} tours. "
                f"Type: {circuit_profile.get('venue_type') or 'a qualifier'}."
            ),
        },
        {
            "id": "location",
            "title": "Lieu",
            "content": (
                f"{summary.get('location')}, {location_profile.get('country')}. "
                f"Adresse: {location_profile.get('address') or 'a verifier'}. "
                f"Fuseau: {summary.get('timezone')}."
            ),
        },
        {
            "id": "prediction_focus",
            "title": "Axes de pronostic",
            "content": (
                "Verifier la forme des deux pilotes par ecurie, la qualif, le risque safety car, "
                "la degradation pneus et les ecarts de performance recents avant de figer le top 10."
            ),
        },
    ]
    return {
        "race_id": context["race_id"],
        "championship_id": context["championship_id"],
        "found": True,
        "title": f"Brief pronostic - {summary.get('race')}",
        "summary": summary,
        "sections": sections,
        "source_document_ids": [document["id"] for document in context.get("documents", [])],
        "useful_links": context.get("useful_links", []),
        "next_actions": [
            "Comparer les tendances pilotes/equipes avec les resultats les plus recents.",
            "Generer les questions bonus adaptees au profil du circuit.",
            "Publier le rappel de pronostic avant la fermeture des qualifications.",
        ],
    }


def team_brief_from_context(context: dict[str, Any]) -> dict[str, Any]:
    """Build a compact team brief from a team context."""
    if not context.get("found"):
        return {
            "team_id": context.get("team_id"),
            "found": False,
            "title": "Brief ecurie indisponible",
            "sections": [],
        }
    summary = context["summary"] or {}
    driver_names = ", ".join(driver.get("name") for driver in summary.get("drivers", []) if driver.get("name"))
    sections = [
        {
            "id": "identity",
            "title": "Identite",
            "content": (
                f"{summary.get('team')} court sous le nom {summary.get('full_team_name')}. "
                f"Base: {(summary.get('base') or {}).get('city')}, {(summary.get('base') or {}).get('country')}."
            ),
        },
        {
            "id": "drivers",
            "title": "Pilotes",
            "content": f"Duo 2026: {driver_names or 'a confirmer'}.",
        },
        {
            "id": "technical",
            "title": "Technique",
            "content": (
                f"Chassis {summary.get('chassis')}, power unit {summary.get('power_unit')}. "
                f"Direction: {summary.get('team_chief') or 'a confirmer'}. "
                f"Technique: {', '.join(summary.get('technical_chiefs') or []) or 'a confirmer'}."
            ),
        },
    ]
    return {
        "team_id": context["team_id"],
        "championship_id": context["championship_id"],
        "found": True,
        "title": f"Brief ecurie - {summary.get('team')}",
        "summary": summary,
        "sections": sections,
        "source_document_ids": [document["id"] for document in context.get("documents", [])],
        "useful_links": context.get("useful_links", []),
    }


def driver_brief_from_context(context: dict[str, Any]) -> dict[str, Any]:
    """Build a compact driver brief from a driver context."""
    if not context.get("found"):
        return {
            "driver_id": context.get("driver_id"),
            "found": False,
            "title": "Brief pilote indisponible",
            "sections": [],
        }
    summary = context["summary"] or {}
    sections = [
        {
            "id": "identity",
            "title": "Pilote",
            "content": (
                f"{summary.get('driver')} ({summary.get('code')}, numero {summary.get('number')}) "
                f"represente {summary.get('country')}."
            ),
        },
        {
            "id": "team",
            "title": "Ecurie",
            "content": (
                f"Equipe: {summary.get('team')}. Chassis {summary.get('chassis')}, "
                f"power unit {summary.get('power_unit')}."
            ),
        },
        {
            "id": "prediction_use",
            "title": "Usage prono",
            "content": (
                "A croiser avec la forme recente, les qualifications et le profil circuit "
                "avant de placer le pilote dans le top 10."
            ),
        },
    ]
    return {
        "driver_id": context["driver_id"],
        "championship_id": context["championship_id"],
        "found": True,
        "title": f"Brief pilote - {summary.get('driver')}",
        "summary": summary,
        "sections": sections,
        "source_document_ids": [document["id"] for document in context.get("documents", [])],
        "useful_links": context.get("useful_links", []),
    }


async def build_prediction_brief(
    *,
    race_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    context = await get_race_knowledge_context(
        race_id=race_id,
        championship_id=championship_id,
    )
    return prediction_brief_from_context(context)


async def build_team_brief(
    *,
    team_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    context = await get_team_knowledge_context(team_id=team_id, championship_id=championship_id)
    return team_brief_from_context(context)


async def build_driver_brief(
    *,
    driver_id: str,
    championship_id: str = F1_2026_CHAMPIONSHIP_ID,
) -> dict[str, Any]:
    context = await get_driver_knowledge_context(driver_id=driver_id, championship_id=championship_id)
    return driver_brief_from_context(context)
