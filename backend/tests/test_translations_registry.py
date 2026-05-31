from services.translations_registry import (
    TRANSLATION_SOURCES,
    filter_translation_entries,
    translation_entry_from_document,
    translation_summary,
)


def test_translation_entry_tracks_locale_gaps():
    source = next(item for item in TRANSLATION_SOURCES if item.key == "legal_pages")
    field = next(item for item in source.fields if item.key == "title_translations")
    entry = translation_entry_from_document(
        source,
        {
            "slug": "mentions-legales",
            "title_translations": {"fr": "Mentions légales", "en": ""},
        },
        field,
    )

    assert entry is not None
    assert entry["document_id"] == "mentions-legales"
    assert entry["translations"]["fr"] == "Mentions légales"
    assert entry["missing_locales"] == ["en"]
    assert entry["completion_rate"] == 0.5


def test_user_generated_sources_are_not_registered_for_translation_completion():
    source_keys = {source.key for source in TRANSLATION_SOURCES}

    assert "leagues" not in source_keys
    assert "predictions" not in source_keys
    assert "custom_predictions" not in source_keys
    assert "league_messages" not in source_keys
    assert "users" not in source_keys


def test_translation_summary_reports_completion_per_locale():
    entries = [
        {
            "source": "legal_pages",
            "source_label": "Pages légales publiques",
            "translations": {"fr": "A", "en": "B"},
        },
        {
            "source": "legal_pages",
            "source_label": "Pages légales publiques",
            "translations": {"fr": "C", "en": ""},
        },
    ]

    summary = translation_summary(entries)

    assert summary["total_entries"] == 2
    assert summary["locales"]["fr"]["rate"] == 100
    assert summary["locales"]["en"]["rate"] == 50
    assert summary["sources"][0]["locales"]["en"]["complete"] == 1


def test_filter_translation_entries_limits_to_missing_locale():
    entries = [
        {"document_label": "Legal", "missing_locales": ["en"], "translations": {"fr": "A", "en": ""}},
        {"document_label": "Calendar", "missing_locales": [], "translations": {"fr": "A", "en": "B"}},
    ]

    filtered = filter_translation_entries(entries, locale="en", missing_only=True)

    assert filtered == [entries[0]]
