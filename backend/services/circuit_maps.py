from __future__ import annotations

import re
import unicodedata
from copy import deepcopy
from datetime import UTC, datetime
from math import isfinite
from typing import Any

from config import db
from data.circuit_maps import CIRCUIT_IMAGES, get_circuit_image_url, get_circuit_map
from data.f1_data import F1_CIRCUITS
from services.championships import F1_2026_CHAMPIONSHIP_ID

CIRCUIT_MAP_REVIEW_STATUSES = {"", "draft", "in_review", "needs_source", "approved"}
CIRCUIT_FEATURE_KINDS = {"start", "corner", "sector", "drs"}
CIRCUIT_ZONE_KINDS = {"sector", "drs"}
REQUIRED_LOCALES = ("fr", "en")
SVG_PATH_ARITY = {
    "M": 2,
    "L": 2,
    "H": 1,
    "V": 1,
    "C": 6,
    "S": 4,
    "Q": 4,
    "T": 2,
    "A": 7,
    "Z": 0,
}
SVG_PATH_TOKEN_RE = re.compile(r"[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-") or "unknown"


def _without_mongo_id(document: dict[str, Any] | None) -> dict[str, Any]:
    return {key: value for key, value in (document or {}).items() if key != "_id"}


def _coerce_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if isfinite(number) else None


def _localized_text_errors(value: Any, field: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{field} doit contenir des traductions fr/en"]
    errors = []
    for locale in REQUIRED_LOCALES:
        if not str(value.get(locale) or "").strip():
            errors.append(f"{field}.{locale} est requis")
    return errors


def _view_box_errors(value: Any) -> list[str]:
    parts = str(value or "").split()
    if len(parts) != 4:
        return ["viewBox doit contenir 4 nombres"]
    if any(_coerce_float(part) is None for part in parts):
        return ["viewBox doit contenir uniquement des nombres"]
    return []


def _svg_path_errors(value: Any, field: str) -> list[str]:
    """Lightweight SVG path validation for admin-authored circuit maps."""
    path = str(value or "").strip()
    if not path:
        return [f"{field} est requis"]

    tokens = SVG_PATH_TOKEN_RE.findall(path.replace(",", " "))
    if not tokens:
        return [f"{field} doit contenir un path SVG"]

    index = 0
    current_command = ""
    while index < len(tokens):
        token = tokens[index]
        if token.isalpha():
            command = token.upper()
            if command not in SVG_PATH_ARITY:
                return [f"{field} contient une commande SVG invalide: {token}"]
            current_command = command
            index += 1
            if command == "Z":
                continue
        elif not current_command:
            return [f"{field} doit commencer par une commande SVG"]

        expected = SVG_PATH_ARITY[current_command]
        if expected == 0:
            return [f"{field} contient des coordonnées après la commande {current_command}"]
        if index + expected > len(tokens):
            return [f"{field} est incomplet pour la commande {current_command}"]
        segment = tokens[index : index + expected]
        if any(part.isalpha() for part in segment):
            return [f"{field} est incomplet pour la commande {current_command}"]
        if any(_coerce_float(part) is None for part in segment):
            return [f"{field} contient une coordonnée invalide"]
        index += expected

    return []


def _validate_map_data(map_data: dict[str, Any]) -> list[str]:
    errors = []
    if not str(map_data.get("fallbackImageUrl") or "").strip():
        errors.append("fallbackImageUrl est requis")
    errors.extend(_view_box_errors(map_data.get("viewBox")))
    if str(map_data.get("trackPath") or "").strip():
        errors.extend(_svg_path_errors(map_data.get("trackPath"), "trackPath"))
    if str(map_data.get("racingLinePath") or "").strip():
        errors.extend(_svg_path_errors(map_data.get("racingLinePath"), "racingLinePath"))

    features = map_data.get("features")
    if not isinstance(features, list):
        errors.append("features doit être un tableau")
        features = []
    feature_ids: set[str] = set()
    feature_by_id: dict[str, dict[str, Any]] = {}
    for index, feature in enumerate(features):
        prefix = f"features[{index}]"
        if not isinstance(feature, dict):
            errors.append(f"{prefix} doit être un objet")
            continue
        feature_id = str(feature.get("id") or "").strip()
        if not feature_id:
            errors.append(f"{prefix}.id est requis")
        else:
            feature_ids.add(feature_id)
            feature_by_id[feature_id] = feature
        if feature.get("kind") not in CIRCUIT_FEATURE_KINDS:
            errors.append(f"{prefix}.kind est invalide")
        x = _coerce_float(feature.get("x"))
        y = _coerce_float(feature.get("y"))
        if x is None or x < 0:
            errors.append(f"{prefix}.x doit être un nombre positif")
        if y is None or y < 0:
            errors.append(f"{prefix}.y doit être un nombre positif")
        errors.extend(_localized_text_errors(feature.get("label"), f"{prefix}.label"))
        errors.extend(_localized_text_errors(feature.get("note"), f"{prefix}.note"))

    requires_first_corner = bool(str(map_data.get("trackPath") or "").strip()) or bool(features)
    first_corner = map_data.get("firstCorner")
    if requires_first_corner:
        if not isinstance(first_corner, dict):
            errors.append("firstCorner est requis pour identifier le premier virage")
        else:
            hotspot_id = str(first_corner.get("hotspotId") or "").strip()
            if not hotspot_id:
                errors.append("firstCorner.hotspotId est requis")
            elif hotspot_id not in feature_ids:
                errors.append("firstCorner.hotspotId doit pointer vers un hotspot de features")
            else:
                feature = feature_by_id.get(hotspot_id) or {}
                if feature.get("kind") != "corner" or feature.get("turn") != 1:
                    errors.append("firstCorner.hotspotId doit pointer vers un virage turn=1")
            errors.extend(_localized_text_errors(first_corner.get("label"), "firstCorner.label"))
            errors.extend(_localized_text_errors(first_corner.get("note"), "firstCorner.note"))

    zones = map_data.get("zones")
    if not isinstance(zones, list):
        errors.append("zones doit être un tableau")
        zones = []
    for index, zone in enumerate(zones):
        prefix = f"zones[{index}]"
        if not isinstance(zone, dict):
            errors.append(f"{prefix} doit être un objet")
            continue
        if not str(zone.get("id") or "").strip():
            errors.append(f"{prefix}.id est requis")
        if zone.get("kind") not in CIRCUIT_ZONE_KINDS:
            errors.append(f"{prefix}.kind est invalide")
        errors.extend(_svg_path_errors(zone.get("path"), f"{prefix}.path"))
        errors.extend(_localized_text_errors(zone.get("label"), f"{prefix}.label"))
        errors.extend(_localized_text_errors(zone.get("note"), f"{prefix}.note"))
    return errors


def _map_quality_report(map_data: dict[str, Any]) -> dict[str, Any]:
    features = map_data.get("features") if isinstance(map_data.get("features"), list) else []
    zones = map_data.get("zones") if isinstance(map_data.get("zones"), list) else []
    feature_by_id = {
        str(feature.get("id")): feature
        for feature in features
        if isinstance(feature, dict) and str(feature.get("id") or "").strip()
    }
    first_corner = map_data.get("firstCorner") if isinstance(map_data.get("firstCorner"), dict) else {}
    first_corner_hotspot_id = str(first_corner.get("hotspotId") or "").strip()
    first_corner_feature = feature_by_id.get(first_corner_hotspot_id)
    has_first_corner = bool(
        first_corner_feature
        and first_corner_feature.get("kind") == "corner"
        and first_corner_feature.get("turn") == 1
    )
    validation_errors = _validate_map_data({**map_data, "fallbackImageUrl": "ok", "viewBox": "0 0 420 280"})
    translation_errors = [error for error in validation_errors if ".label." in error or ".note." in error]
    path_errors = [error for error in validation_errors if "path" in error or "Path" in error]
    warnings = []
    if not str(map_data.get("fallbackImageUrl") or "").strip():
        warnings.append("Image fallback manquante")
    if not str(map_data.get("trackPath") or "").strip():
        warnings.append("Path SVG principal manquant")
    if not features:
        warnings.append("Aucun point interactif")
    if not zones:
        warnings.append("Aucune zone DRS/secteur")
    if str(map_data.get("trackPath") or "").strip() and not has_first_corner:
        warnings.append("Premier virage non identifié")
    if translation_errors:
        warnings.append("Traductions fr/en incomplètes")
    if path_errors:
        warnings.append("Path SVG invalide")
    return {
        "is_interactive": bool(str(map_data.get("trackPath") or "").strip()),
        "has_fallback_image": bool(str(map_data.get("fallbackImageUrl") or "").strip()),
        "has_first_corner": has_first_corner,
        "first_corner_hotspot_id": first_corner_hotspot_id,
        "features_count": len(features),
        "zones_count": len(zones),
        "missing_translations": len(translation_errors),
        "path_errors": len(path_errors),
        "warnings": warnings,
        "ready_for_public": not warnings,
    }


def _review_priority(record: dict[str, Any]) -> dict[str, Any]:
    quality = record.get("quality_report") or {}
    review_status = record.get("review_status") or ""
    if review_status == "approved" and quality.get("ready_for_public"):
        return {
            "level": "done",
            "label": "Publié",
            "reason": "Carte validée et publiable",
        }
    if quality.get("path_errors"):
        return {
            "level": "blocked",
            "label": "Path SVG",
            "reason": "Corriger les paths SVG avant validation",
        }
    if quality.get("missing_translations"):
        return {
            "level": "blocked",
            "label": "i18n",
            "reason": "Compléter les traductions fr/en",
        }
    if quality.get("is_interactive") and not quality.get("has_first_corner"):
        return {
            "level": "blocked",
            "label": "Premier virage",
            "reason": "Identifier le premier virage pour les statistiques pilotes",
        }
    if not quality.get("is_interactive"):
        return {
            "level": "blocked",
            "label": "À tracer",
            "reason": "Ajouter le tracé SVG interactif",
        }
    if review_status in {"", "draft", "needs_source"}:
        return {
            "level": "review",
            "label": "À revoir",
            "reason": "Carte prête à relire puis approuver",
        }
    if review_status == "in_review":
        return {
            "level": "review",
            "label": "En revue",
            "reason": "Relecture admin en cours",
        }
    return {
        "level": "review",
        "label": "À qualifier",
        "reason": "Statut métier à préciser",
    }


def _known_circuit_names() -> list[str]:
    names = set(F1_CIRCUITS.keys()) | set(CIRCUIT_IMAGES.keys())
    return sorted(names)


def _minimal_map_data(circuit_name: str) -> dict[str, Any]:
    key = _slug(circuit_name)
    return {
        "key": key,
        "circuitName": circuit_name,
        "aliases": [circuit_name],
        "fallbackImageUrl": get_circuit_image_url(circuit_name),
        "viewBox": "0 0 420 280",
        "features": [],
        "zones": [],
    }


def _seed_record(circuit_name: str) -> dict[str, Any]:
    seeded_map = get_circuit_map(circuit_name)
    map_data = seeded_map or _minimal_map_data(circuit_name)
    circuit_info = F1_CIRCUITS.get(circuit_name, {})
    has_interactive_path = bool(map_data.get("trackPath"))
    record = {
        "key": str(map_data.get("key") or _slug(circuit_name)),
        "circuit_name": circuit_name,
        "full_name": circuit_info.get("full_name", circuit_name),
        "map_status": "interactive_seeded" if has_interactive_path else "static_fallback",
        "data_status": "seeded" if seeded_map else "fallback_only",
        "review_status": "",
        "owner_admin_email": "",
        "admin_notes": "",
        "source": "seed",
        "map_data": map_data,
        "quality_report": _map_quality_report(map_data),
    }
    record["review_priority"] = _review_priority(record)
    return record


def _all_seed_records() -> list[dict[str, Any]]:
    return [_seed_record(circuit_name) for circuit_name in _known_circuit_names()]


def _record_matches(record: dict[str, Any], query: str) -> bool:
    if not query:
        return True
    haystack = " ".join(
        str(part or "")
        for part in [
            record.get("key"),
            record.get("circuit_name"),
            record.get("full_name"),
            record.get("map_status"),
            record.get("review_status"),
            record.get("owner_admin_email"),
            record.get("admin_notes"),
            record.get("map_data", {}).get("aliases"),
        ]
    )
    return query.lower() in haystack.lower()


def _normalize_map_data(key: str, circuit_name: str, map_data: dict[str, Any] | None) -> dict[str, Any]:
    merged = _minimal_map_data(circuit_name)
    seeded = get_circuit_map(circuit_name)
    if seeded:
        merged.update(deepcopy(seeded))
    if map_data:
        merged.update(deepcopy(map_data))
    merged["key"] = key
    merged["circuitName"] = str(merged.get("circuitName") or circuit_name)
    merged["aliases"] = [
        str(alias).strip()
        for alias in (merged.get("aliases") or [circuit_name])
        if str(alias or "").strip()
    ]
    merged["features"] = list(merged.get("features") or [])
    merged["zones"] = list(merged.get("zones") or [])
    return merged


def _apply_override(seed: dict[str, Any], override: dict[str, Any] | None) -> dict[str, Any]:
    if not override:
        return seed

    override = _without_mongo_id(override)
    map_data = _normalize_map_data(
        seed["key"],
        seed["circuit_name"],
        override.get("map_data") or seed.get("map_data"),
    )
    has_interactive_path = bool(map_data.get("trackPath"))
    record = {
        **seed,
        **{
            key: override.get(key, seed.get(key))
            for key in [
                "review_status",
                "data_status",
                "owner_admin_email",
                "admin_notes",
                "updated_at",
                "updated_by",
                "created_at",
                "created_by",
            ]
        },
        "source": "admin",
        "map_status": "admin_interactive" if has_interactive_path else "admin_static",
        "map_data": map_data,
        "quality_report": _map_quality_report(map_data),
    }
    record["review_priority"] = _review_priority(record)
    return record


async def _sync_knowledge_entity(record: dict[str, Any], actor: str | None) -> None:
    await db.knowledge_entities.update_one(
        {
            "entity_type": "circuit",
            "canonical_key": record["circuit_name"],
            "championship_id": F1_2026_CHAMPIONSHIP_ID,
        },
        {
            "$set": {
                "circuit.map_status": record["map_status"],
                "circuit.map_image_url": record["map_data"].get("fallbackImageUrl"),
                "circuit.interactive_map": record["map_data"],
                "review_status": record.get("review_status") or None,
                "owner_admin_email": record.get("owner_admin_email") or None,
                "admin_notes": record.get("admin_notes") or "",
                "updated_at": _now_iso(),
                "updated_by": actor,
            }
        },
    )


async def list_circuit_map_records(
    *,
    q: str = "",
    review_status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    source: str | None = None,
    current_admin_email: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    overrides = {
        doc["key"]: doc
        for doc in await db.circuit_maps.find({}, {"_id": 0}).to_list(200)
        if doc.get("key")
    }
    records = [_apply_override(seed, overrides.get(seed["key"])) for seed in _all_seed_records()]
    if review_status is not None and review_status != "all":
        records = [record for record in records if (record.get("review_status") or "") == review_status]
    if priority and priority != "all":
        records = [
            record for record in records if record.get("review_priority", {}).get("level") == priority
        ]
    if owner and owner != "all":
        if owner == "mine" and current_admin_email:
            records = [
                record
                for record in records
                if str(record.get("owner_admin_email") or "").lower() == current_admin_email.lower()
            ]
        elif owner == "unassigned":
            records = [record for record in records if not str(record.get("owner_admin_email") or "").strip()]
        elif owner == "assigned":
            records = [record for record in records if str(record.get("owner_admin_email") or "").strip()]
        elif owner not in {"mine", "unassigned", "assigned"}:
            records = []
    if source and source != "all":
        records = [record for record in records if record.get("source") == source]
    records = [record for record in records if _record_matches(record, q.strip())]

    summary = {
        "interactive": len([record for record in records if record["map_data"].get("trackPath")]),
        "static": len([record for record in records if not record["map_data"].get("trackPath")]),
        "admin_overrides": len([record for record in records if record.get("source") == "admin"]),
        "approved": len([record for record in records if record.get("review_status") == "approved"]),
        "needs_review": len([record for record in records if record.get("review_status") != "approved"]),
        "ready_for_public": len(
            [record for record in records if record.get("quality_report", {}).get("ready_for_public")]
        ),
        "first_corner_ready": len(
            [record for record in records if record.get("quality_report", {}).get("has_first_corner")]
        ),
        "missing_first_corner": len(
            [
                record
                for record in records
                if record.get("quality_report", {}).get("is_interactive")
                and not record.get("quality_report", {}).get("has_first_corner")
            ]
        ),
        "blocked": len(
            [record for record in records if record.get("review_priority", {}).get("level") == "blocked"]
        ),
        "in_review": len(
            [record for record in records if record.get("review_priority", {}).get("level") == "review"]
        ),
        "owned_by_me": len(
            [
                record
                for record in records
                if current_admin_email
                and str(record.get("owner_admin_email") or "").lower() == current_admin_email.lower()
            ]
        ),
        "unassigned": len([record for record in records if not str(record.get("owner_admin_email") or "").strip()]),
        "total_features": sum(len(record.get("map_data", {}).get("features", [])) for record in records),
        "total_zones": sum(len(record.get("map_data", {}).get("zones", [])) for record in records),
    }
    summary["coverage_percent"] = round((summary["interactive"] / len(records)) * 100) if records else 0
    total = len(records)
    return {"items": records[skip : skip + limit], "total": total, "summary": summary}


async def get_effective_circuit_map(circuit_name: str | None) -> dict[str, Any] | None:
    if not circuit_name:
        return None
    seed = _seed_record(circuit_name)
    override = await db.circuit_maps.find_one({"key": seed["key"]}, {"_id": 0})
    record = _apply_override(seed, override)
    return record["map_data"] if record["map_data"].get("trackPath") else None


async def get_effective_circuit_image_url(circuit_name: str | None) -> str | None:
    if not circuit_name:
        return None
    seed = _seed_record(circuit_name)
    override = await db.circuit_maps.find_one({"key": seed["key"]}, {"_id": 0})
    record = _apply_override(seed, override)
    return record["map_data"].get("fallbackImageUrl") or get_circuit_image_url(circuit_name)


async def update_circuit_map_record(
    key: str,
    *,
    map_data: dict[str, Any] | None = None,
    review_status: str | None = None,
    data_status: str | None = None,
    owner_admin_email: str | None = None,
    admin_notes: str | None = None,
    actor: str | None = None,
) -> dict[str, Any] | None:
    seed = next((record for record in _all_seed_records() if record["key"] == key), None)
    if not seed:
        return None

    if review_status is not None and review_status not in CIRCUIT_MAP_REVIEW_STATUSES:
        raise ValueError("review_status invalide")

    existing = await db.circuit_maps.find_one({"key": key}, {"_id": 0})
    effective = _apply_override(seed, existing)
    now = _now_iso()
    normalized_map = _normalize_map_data(
        key,
        seed["circuit_name"],
        map_data if map_data is not None else effective.get("map_data"),
    )
    validation_errors = _validate_map_data(normalized_map)
    if validation_errors:
        detail = "; ".join(validation_errors[:8])
        if len(validation_errors) > 8:
            detail = f"{detail}; +{len(validation_errors) - 8} autre(s) erreur(s)"
        raise ValueError(f"Carte circuit invalide: {detail}")
    quality_report = _map_quality_report(normalized_map)
    if review_status == "approved" and not quality_report["ready_for_public"]:
        warnings = ", ".join(quality_report["warnings"])
        raise ValueError(f"Une carte approuvée doit être publiable: {warnings}")
    payload = {
        "key": key,
        "circuit_name": seed["circuit_name"],
        "full_name": seed["full_name"],
        "map_data": normalized_map,
        "review_status": review_status if review_status is not None else effective.get("review_status", ""),
        "data_status": data_status if data_status is not None else effective.get("data_status", "seeded"),
        "owner_admin_email": (
            owner_admin_email if owner_admin_email is not None else effective.get("owner_admin_email", "")
        ),
        "admin_notes": admin_notes if admin_notes is not None else effective.get("admin_notes", ""),
        "updated_at": now,
        "updated_by": actor,
    }
    result = await db.circuit_maps.update_one(
        {"key": key},
        {"$set": payload, "$setOnInsert": {"created_at": now, "created_by": actor}},
        upsert=True,
    )
    stored = await db.circuit_maps.find_one({"key": key}, {"_id": 0})
    record = _apply_override(seed, stored or payload)
    await _sync_knowledge_entity(record, actor)
    record["upserted"] = bool(result.upserted_id)
    return record


async def reset_circuit_map_record(key: str, *, actor: str | None = None) -> dict[str, Any] | None:
    seed = next((record for record in _all_seed_records() if record["key"] == key), None)
    if not seed:
        return None

    result = await db.circuit_maps.delete_one({"key": key})
    record = _apply_override(seed, None)
    record["reset"] = bool(getattr(result, "deleted_count", 0))
    record["updated_at"] = _now_iso()
    record["updated_by"] = actor
    await _sync_knowledge_entity(record, actor)
    return record
