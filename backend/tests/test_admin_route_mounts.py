from collections import Counter

from server import app


def _route_counts() -> Counter[tuple[str, str]]:
    counts: Counter[tuple[str, str]] = Counter()
    for route in app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api/admin-bo/"):
            continue
        for method in getattr(route, "methods", set()) or set():
            if method in {"HEAD", "OPTIONS"}:
                continue
            counts[(method, path)] += 1
    return counts


def test_admin_backoffice_routes_are_mounted_once():
    counts = _route_counts()
    duplicates = {route: count for route, count in counts.items() if count > 1}

    assert duplicates == {}


def test_admin_business_domain_routes_are_present():
    counts = _route_counts()

    expected_routes = {
        ("GET", "/api/admin-bo/championships"),
        ("GET", "/api/admin-bo/invitations"),
        ("GET", "/api/admin-bo/invitations/analytics"),
        ("GET", "/api/admin-bo/legal-pages"),
        ("POST", "/api/admin-bo/invitations"),
        ("POST", "/api/admin-bo/invitations/batch"),
        ("POST", "/api/admin-bo/championships"),
        ("POST", "/api/admin-bo/championships/seed-f1-2026"),
        ("POST", "/api/admin-bo/legal-pages/seed-defaults"),
        ("GET", "/api/admin-bo/leagues"),
        ("GET", "/api/admin-bo/leagues/analytics"),
        ("GET", "/api/admin-bo/media"),
        ("POST", "/api/admin-bo/media/upload"),
        ("GET", "/api/admin-bo/predictions"),
        ("GET", "/api/admin-bo/races"),
        ("GET", "/api/admin-bo/settings"),
        ("GET", "/api/admin-bo/users"),
    }

    missing = [route for route in sorted(expected_routes) if counts[route] != 1]
    assert missing == []
