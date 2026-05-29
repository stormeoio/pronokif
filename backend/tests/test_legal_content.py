from services.legal_content import DEFAULT_LEGAL_PAGES, localized_legal_page


def test_default_legal_pages_are_translation_ready():
    slugs = {page["slug"] for page in DEFAULT_LEGAL_PAGES}

    assert {"mentions-legales", "cgu", "confidentialite"}.issubset(slugs)
    assert all(page["title_translations"]["fr"] for page in DEFAULT_LEGAL_PAGES)
    assert all(page["content_translations"]["fr"] for page in DEFAULT_LEGAL_PAGES)


def test_localized_legal_page_falls_back_to_french():
    page = localized_legal_page(
        {
            "slug": "cgu",
            "version": "2026.05",
            "title_translations": {"fr": "Conditions générales d'utilisation"},
            "summary_translations": {"fr": "Résumé"},
            "content_translations": {"fr": "Objet\nTexte"},
        },
        locale="en",
    )

    assert page["locale"] == "en"
    assert page["title"] == "Conditions générales d'utilisation"
    assert page["summary"] == "Résumé"
    assert page["content"] == "Objet\nTexte"
