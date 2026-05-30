from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


SUPPORTED_LOCALES = ("fr", "en")
SOURCE_LOCALE = "fr"


@dataclass(frozen=True)
class TranslationField:
    key: str
    label: str


@dataclass(frozen=True)
class TranslationSource:
    key: str
    label: str
    collection: str
    identity_field: str
    fields: tuple[TranslationField, ...]
    title_fields: tuple[str, ...] = ()
    sort_field: str | None = None


TRANSLATION_SOURCES: tuple[TranslationSource, ...] = (
    TranslationSource(
        key="legal_pages",
        label="Pages légales publiques",
        collection="legal_pages",
        identity_field="slug",
        title_fields=("title_translations.fr", "title", "slug"),
        sort_field="order",
        fields=(
            TranslationField("title_translations", "Titre"),
            TranslationField("summary_translations", "Résumé"),
            TranslationField("content_translations", "Contenu"),
        ),
    ),
    TranslationSource(
        key="championships",
        label="Championnats",
        collection="championships",
        identity_field="id",
        title_fields=("name_translations.fr", "name", "slug", "id"),
        sort_field="season",
        fields=(
            TranslationField("name_translations", "Nom"),
            TranslationField("description_translations", "Description"),
        ),
    ),
    TranslationSource(
        key="leagues",
        label="Ligues",
        collection="leagues",
        identity_field="id",
        title_fields=("name_translations.fr", "name", "code", "id"),
        sort_field="created_at",
        fields=(
            TranslationField("name_translations", "Nom"),
            TranslationField("description_translations", "Description"),
        ),
    ),
    TranslationSource(
        key="knowledge_entities",
        label="Base RAG - entités",
        collection="knowledge_entities",
        identity_field="id",
        title_fields=("name_translations.fr", "name", "canonical_key", "id"),
        sort_field="entity_type",
        fields=(TranslationField("name_translations", "Nom"),),
    ),
    TranslationSource(
        key="knowledge_documents",
        label="Base RAG - documents",
        collection="knowledge_documents",
        identity_field="id",
        title_fields=("title_translations.fr", "title", "id"),
        sort_field="entity_type",
        fields=(
            TranslationField("title_translations", "Titre"),
            TranslationField("content_translations", "Contenu"),
        ),
    ),
)

SOURCE_BY_KEY = {source.key: source for source in TRANSLATION_SOURCES}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _get_path(document: dict[str, Any], path: str) -> Any:
    current: Any = document
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value).strip()


def _localized_value(document: dict[str, Any], field_key: str, locale: str) -> str:
    translations = document.get(field_key)
    if isinstance(translations, dict):
        return _clean_text(translations.get(locale))
    return ""


def _document_label(source: TranslationSource, document: dict[str, Any]) -> str:
    for field_path in source.title_fields:
        value = _clean_text(_get_path(document, field_path))
        if value:
            return value
    return _clean_text(document.get(source.identity_field)) or "Contenu sans identifiant"


def _empty_locale_summary() -> dict[str, dict[str, int | float]]:
    return {locale: {"complete": 0, "total": 0, "rate": 0} for locale in SUPPORTED_LOCALES}


def translation_entry_from_document(
    source: TranslationSource,
    document: dict[str, Any],
    field: TranslationField,
) -> dict[str, Any] | None:
    document_id = _clean_text(document.get(source.identity_field))
    if not document_id:
        return None

    translations = {
        locale: _localized_value(document, field.key, locale)
        for locale in SUPPORTED_LOCALES
    }
    missing_locales = [
        locale
        for locale in SUPPORTED_LOCALES
        if not translations.get(locale)
    ]
    completed = len(SUPPORTED_LOCALES) - len(missing_locales)
    return {
        "id": f"{source.key}:{document_id}:{field.key}",
        "source": source.key,
        "source_label": source.label,
        "document_id": document_id,
        "document_label": _document_label(source, document),
        "field": field.key,
        "field_label": field.label,
        "translations": translations,
        "missing_locales": missing_locales,
        "completion_rate": round(completed / len(SUPPORTED_LOCALES), 4),
        "updated_at": document.get("updated_at"),
        "updated_by": document.get("updated_by"),
    }


def translation_summary(entries: list[dict[str, Any]]) -> dict[str, Any]:
    locale_summary = _empty_locale_summary()
    source_summary: dict[str, dict[str, Any]] = {}
    for entry in entries:
        source_key = entry["source"]
        source_payload = source_summary.setdefault(
            source_key,
            {
                "source": source_key,
                "label": entry["source_label"],
                "fields": 0,
                "locales": _empty_locale_summary(),
            },
        )
        source_payload["fields"] += 1
        for locale in SUPPORTED_LOCALES:
            complete = 1 if _clean_text(entry["translations"].get(locale)) else 0
            locale_summary[locale]["complete"] += complete
            locale_summary[locale]["total"] += 1
            source_payload["locales"][locale]["complete"] += complete
            source_payload["locales"][locale]["total"] += 1

    for summary in [locale_summary, *[item["locales"] for item in source_summary.values()]]:
        for locale in SUPPORTED_LOCALES:
            total = int(summary[locale]["total"])
            complete = int(summary[locale]["complete"])
            summary[locale]["rate"] = round((complete / total) * 100, 1) if total else 0

    return {
        "total_entries": len(entries),
        "total_translation_slots": len(entries) * len(SUPPORTED_LOCALES),
        "locales": locale_summary,
        "sources": sorted(source_summary.values(), key=lambda item: item["label"]),
    }


def filter_translation_entries(
    entries: list[dict[str, Any]],
    *,
    q: str = "",
    locale: str | None = None,
    missing_only: bool = False,
) -> list[dict[str, Any]]:
    cleaned_query = q.strip().lower()
    filtered = entries
    if cleaned_query:
        filtered = [
            entry
            for entry in filtered
            if cleaned_query
            in " ".join(
                [
                    entry.get("source_label", ""),
                    entry.get("document_id", ""),
                    entry.get("document_label", ""),
                    entry.get("field_label", ""),
                    " ".join(entry.get("translations", {}).values()),
                ]
            ).lower()
        ]
    if locale and locale in SUPPORTED_LOCALES:
        filtered = [entry for entry in filtered if locale in entry.get("missing_locales", [])]
    if missing_only:
        filtered = [entry for entry in filtered if entry.get("missing_locales")]
    return filtered


async def build_translation_registry(
    db_handle: Any,
    *,
    source: str | None = None,
    q: str = "",
    locale: str | None = None,
    missing_only: bool = False,
    limit: int = 500,
) -> dict[str, Any]:
    source_configs = [SOURCE_BY_KEY[source]] if source in SOURCE_BY_KEY else list(TRANSLATION_SOURCES)
    entries: list[dict[str, Any]] = []

    for source_config in source_configs:
        collection = getattr(db_handle, source_config.collection)
        cursor = collection.find({}, {"_id": 0})
        if source_config.sort_field:
            cursor = cursor.sort(source_config.sort_field, 1)
        documents = await cursor.limit(max(limit, 1)).to_list(max(limit, 1))
        for document in documents:
            for field in source_config.fields:
                entry = translation_entry_from_document(source_config, document, field)
                if entry:
                    entries.append(entry)

    summary = translation_summary(entries)
    filtered_entries = filter_translation_entries(
        entries,
        q=q,
        locale=locale,
        missing_only=missing_only,
    )
    return {
        "locales": list(SUPPORTED_LOCALES),
        "source_locale": SOURCE_LOCALE,
        "sources": [
            {"key": item.key, "label": item.label, "fields": [field.key for field in item.fields]}
            for item in TRANSLATION_SOURCES
        ],
        "summary": summary,
        "entries": filtered_entries[: max(limit, 1)],
        "filtered_total": len(filtered_entries),
    }


async def update_translation_value(
    db_handle: Any,
    *,
    source: str,
    document_id: str,
    field: str,
    locale: str,
    value: str,
    actor: str | None = None,
) -> dict[str, Any] | None:
    source_config = SOURCE_BY_KEY.get(source)
    if not source_config:
        raise ValueError("unknown_source")
    if locale not in SUPPORTED_LOCALES:
        raise ValueError("unknown_locale")
    if field not in {item.key for item in source_config.fields}:
        raise ValueError("unknown_field")

    collection = getattr(db_handle, source_config.collection)
    now = _now_iso()
    result = await collection.update_one(
        {source_config.identity_field: document_id},
        {
            "$set": {
                f"{field}.{locale}": value.strip(),
                "updated_at": now,
                "updated_by": actor,
            }
        },
    )
    if result.matched_count == 0:
        return None
    return await collection.find_one({source_config.identity_field: document_id}, {"_id": 0})
