"""
Legal content management for public pages and admin curation.

Pages use stable slugs and locale-keyed fields so the BO can later add
translations without changing URLs or database contracts.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from config import db

DEFAULT_LOCALE = "fr"
LEGAL_PAGE_SLUGS = ("mentions-legales", "cgu", "confidentialite")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


DEFAULT_LEGAL_PAGES: list[dict[str, Any]] = [
    {
        "id": "mentions-legales",
        "slug": "mentions-legales",
        "order": 10,
        "status": "published",
        "version": "2026.05",
        "title_translations": {"fr": "Mentions légales"},
        "summary_translations": {
            "fr": "Identification de l'éditeur, hébergement, propriété intellectuelle et contact.",
        },
        "content_translations": {
            "fr": (
                "Éditeur\n"
                "PronoKif est une application indépendante de pronostics autour de la Formule 1, "
                "éditée par l'équipe PronoKif. Les informations administratives complètes de "
                "l'éditeur doivent être finalisées avant l'ouverture publique.\n\n"
                "Contact\n"
                "Pour toute demande relative au service, vous pouvez écrire à contact@pronokif.eu.\n\n"
                "Hébergement\n"
                "Le service est hébergé par l'infrastructure technique configurée pour PronoKif. "
                "Les coordonnées complètes de l'hébergeur doivent être précisées avant publication.\n\n"
                "Propriété intellectuelle\n"
                "Les marques, logos, interfaces, textes, visuels et éléments logiciels de PronoKif "
                "sont protégés. Toute reproduction non autorisée est interdite.\n\n"
                "Indépendance\n"
                "PronoKif n'est pas affilié, sponsorisé ou approuvé par Formula 1, la FIA, les "
                "écuries ou les détenteurs officiels des droits de la Formule 1."
            ),
        },
    },
    {
        "id": "cgu",
        "slug": "cgu",
        "order": 20,
        "status": "published",
        "version": "2026.05",
        "title_translations": {"fr": "Conditions générales d'utilisation"},
        "summary_translations": {
            "fr": "Règles d'accès, d'utilisation, de pronostics, de ligues et de modération.",
        },
        "content_translations": {
            "fr": (
                "Objet\n"
                "Les présentes conditions encadrent l'accès et l'utilisation de PronoKif, un service "
                "de pronostics F1 entre amis, ligues privées et classements ludiques.\n\n"
                "Compte utilisateur\n"
                "L'utilisateur s'engage à fournir des informations exactes, à garder ses accès "
                "confidentiels et à ne pas créer de compte dans le but de contourner les règles du jeu.\n\n"
                "Pronostics et classements\n"
                "Les pronostics doivent être saisis avant les délais affichés dans l'application. "
                "Les scores, mini-jeux et classements peuvent être recalculés en cas d'erreur de "
                "données, de calendrier ou de résultat officiel.\n\n"
                "Comportement\n"
                "Les échanges dans les ligues doivent rester respectueux. PronoKif peut modérer, "
                "suspendre ou supprimer un contenu ou un compte en cas d'abus, fraude ou comportement "
                "contraire à l'esprit du jeu.\n\n"
                "Disponibilité\n"
                "Le service est fourni en l'état. Des interruptions peuvent survenir pour maintenance, "
                "déploiement, correction ou incident technique.\n\n"
                "Évolution des conditions\n"
                "Les présentes conditions peuvent être mises à jour. La version applicable est celle "
                "publiée dans l'application au moment de l'utilisation."
            ),
        },
    },
    {
        "id": "confidentialite",
        "slug": "confidentialite",
        "order": 30,
        "status": "published",
        "version": "2026.05",
        "title_translations": {"fr": "Politique de confidentialité"},
        "summary_translations": {
            "fr": "Données collectées, finalités, sécurité, cookies et droits des utilisateurs.",
        },
        "content_translations": {
            "fr": (
                "Données collectées\n"
                "PronoKif peut traiter les informations de compte, les pronostics, les ligues, les "
                "messages, les statistiques de jeu, les préférences et les données techniques nécessaires "
                "au fonctionnement du service.\n\n"
                "Finalités\n"
                "Ces données servent à créer le compte, afficher les classements, calculer les scores, "
                "sécuriser l'accès, envoyer des notifications utiles et améliorer l'expérience.\n\n"
                "Sécurité\n"
                "Les sessions utilisent des cookies httpOnly et les accès administrateur sont protégés "
                "par lien magique et, le cas échéant, authentification à deux facteurs.\n\n"
                "Conservation\n"
                "Les données sont conservées pendant la durée nécessaire au fonctionnement du service, "
                "à la sécurité et aux obligations légales éventuelles.\n\n"
                "Droits\n"
                "Vous pouvez demander l'accès, la rectification ou la suppression de vos données en "
                "contactant contact@pronokif.eu.\n\n"
                "Cookies et PWA\n"
                "L'application peut utiliser des cookies de session, du stockage local et un service "
                "worker afin de maintenir la session, mémoriser certains choix et proposer une expérience PWA."
            ),
        },
    },
]


def _without_mongo_id(document: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in document.items() if key != "_id"}


def localized_legal_page(page: dict[str, Any], locale: str = DEFAULT_LOCALE) -> dict[str, Any]:
    """Return a public/admin friendly localized projection."""
    clean = _without_mongo_id(page)
    resolved_locale = locale or DEFAULT_LOCALE
    title_translations = clean.get("title_translations") or {}
    summary_translations = clean.get("summary_translations") or {}
    content_translations = clean.get("content_translations") or {}
    return {
        **clean,
        "locale": resolved_locale,
        "title": title_translations.get(resolved_locale) or title_translations.get(DEFAULT_LOCALE) or clean["slug"],
        "summary": summary_translations.get(resolved_locale) or summary_translations.get(DEFAULT_LOCALE) or "",
        "content": content_translations.get(resolved_locale) or content_translations.get(DEFAULT_LOCALE) or "",
    }


async def ensure_default_legal_pages(actor: str | None = None) -> dict[str, int]:
    """Insert missing legal pages while preserving admin-edited content."""
    now = _now_iso()
    inserted = 0
    existing = 0
    for page in DEFAULT_LEGAL_PAGES:
        result = await db.legal_pages.update_one(
            {"slug": page["slug"]},
            {
                "$setOnInsert": {
                    **page,
                    "created_at": now,
                    "created_by": actor,
                    "updated_at": now,
                    "updated_by": actor,
                    "published_at": now if page.get("status") == "published" else None,
                }
            },
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            existing += 1
    return {"inserted": inserted, "existing": existing, "total": len(DEFAULT_LEGAL_PAGES)}


async def list_legal_pages(
    *,
    locale: str = DEFAULT_LOCALE,
    include_drafts: bool = False,
) -> dict[str, Any]:
    await ensure_default_legal_pages()
    query: dict[str, Any] = {}
    if not include_drafts:
        query["status"] = "published"
    pages = await db.legal_pages.find(query, {"_id": 0}).sort("order", 1).to_list(50)
    return {
        "pages": [localized_legal_page(page, locale=locale) for page in pages],
        "total": len(pages),
        "locale": locale,
    }


async def get_legal_page(
    slug: str,
    *,
    locale: str = DEFAULT_LOCALE,
    include_drafts: bool = False,
) -> dict[str, Any] | None:
    await ensure_default_legal_pages()
    query: dict[str, Any] = {"slug": slug}
    if not include_drafts:
        query["status"] = "published"
    page = await db.legal_pages.find_one(query, {"_id": 0})
    if not page:
        return None
    return localized_legal_page(page, locale=locale)


async def update_legal_page(
    slug: str,
    updates: dict[str, Any],
    *,
    actor: str | None = None,
) -> dict[str, Any] | None:
    await ensure_default_legal_pages(actor=actor)
    existing = await db.legal_pages.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        return None

    allowed_fields = {
        "title_translations",
        "summary_translations",
        "content_translations",
        "status",
        "version",
        "order",
    }
    payload = {key: value for key, value in updates.items() if key in allowed_fields}
    if not payload:
        return localized_legal_page(existing)

    now = _now_iso()
    payload["updated_at"] = now
    payload["updated_by"] = actor
    if payload.get("status") == "published":
        payload["published_at"] = existing.get("published_at") or now

    await db.legal_pages.update_one({"slug": slug}, {"$set": payload})
    page = await db.legal_pages.find_one({"slug": slug}, {"_id": 0})
    return localized_legal_page(page or existing)
