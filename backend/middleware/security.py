"""
Security middleware bundle for the Pronokif FastAPI app.

Wires three things on the application:

1. Strict CORS — origins MUST come from the CORS_ORIGINS env var as an
   explicit comma-separated list. The wildcard "*" is rejected outright
   in non-development environments. Credentials are allowed only against
   specific origins (the spec forbids "*" + credentials anyway).

2. Security response headers — HSTS, X-Content-Type-Options,
   X-Frame-Options, Referrer-Policy, Permissions-Policy. Set on every
   response via a lightweight ASGI middleware so they cover both
   FastAPI routes and the auto-generated /docs page.

3. Rate-limit hook (best-effort) — if `slowapi` is installed, a
   per-IP limiter is attached and exposed via app.state.limiter so
   route handlers can decorate themselves with @limiter.limit("...").
   When slowapi is missing the function is a no-op so the boot does
   not break in fresh dev environments. Install with:
       pip install slowapi
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit, urlunsplit

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

# --------------------------------------------------------------------------- #
# 1. CORS                                                                     #
# --------------------------------------------------------------------------- #


def _parse_origins(raw: str | None, environment: str) -> list[str]:
    """
    Parse CORS_ORIGINS into a clean list. Refuse "*" outside of dev.

    Returns an empty list when the variable is unset — the caller decides
    what to do (we choose to fail fast in non-dev to avoid silently
    accepting cross-origin requests from anywhere).
    """
    if not raw:
        return []
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if "*" in origins and environment.lower() not in {"development", "dev", "local"}:
        raise RuntimeError(
            "CORS_ORIGINS='*' is forbidden outside of development. "
            "Set CORS_ORIGINS to an explicit comma-separated list of "
            "allowed origins (e.g. https://app.pronokif.com)."
        )
    return origins


def _with_dev_loopback_aliases(origins: list[str], environment: str) -> list[str]:
    """In local dev, allow localhost and 127.0.0.1 to be used interchangeably."""
    if environment.lower() not in {"development", "dev", "local"}:
        return origins

    seen = set(origins)
    with_aliases = list(origins)

    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.hostname not in {"localhost", "127.0.0.1"}:
            continue

        alias_host = "127.0.0.1" if parsed.hostname == "localhost" else "localhost"
        netloc = alias_host
        if parsed.port:
            netloc = f"{alias_host}:{parsed.port}"

        alias = urlunsplit((parsed.scheme, netloc, "", "", ""))
        if alias not in seen:
            seen.add(alias)
            with_aliases.append(alias)

    return with_aliases


def _dev_loopback_origin_regex(environment: str) -> str | None:
    """Allow Vite's alternate local ports in dev without weakening production CORS."""
    if environment.lower() not in {"development", "dev", "local"}:
        return None
    return r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"


def install_cors(app: FastAPI) -> None:
    """Install a strict CORS middleware on the app."""
    environment = os.environ.get("ENVIRONMENT", "development")
    origins = _parse_origins(os.environ.get("CORS_ORIGINS"), environment)

    if not origins:
        if environment.lower() in {"development", "dev", "local"}:
            origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        else:
            raise RuntimeError(
                "CORS_ORIGINS is required outside of development. Set it in the environment to a comma-separated list."
            )
    origins = _with_dev_loopback_aliases(origins, environment)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=_dev_loopback_origin_regex(environment),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        max_age=600,
    )


# --------------------------------------------------------------------------- #
# 2. Security headers                                                         #
# --------------------------------------------------------------------------- #


_DEFAULT_HEADERS: dict[str, str] = {
    # Force HTTPS for one year, including subdomains. Safe to set always —
    # browsers ignore it on plain http://.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    # Refuse to render in any frame to defeat clickjacking.
    "X-Frame-Options": "DENY",
    # Stop browsers from guessing MIME types.
    "X-Content-Type-Options": "nosniff",
    # Don't leak full URLs to third parties on outbound links.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    # Disable browser features the API doesn't need.
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add a set of conservative security headers to every response."""

    def __init__(self, app, headers: dict[str, str] | None = None) -> None:
        super().__init__(app)
        self._headers = headers or _DEFAULT_HEADERS

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for name, value in self._headers.items():
            response.headers.setdefault(name, value)
        return response


def install_security_headers(app: FastAPI) -> None:
    app.add_middleware(SecurityHeadersMiddleware)


# --------------------------------------------------------------------------- #
# 3. Rate limit (optional, slowapi)                                           #
# --------------------------------------------------------------------------- #


# Shared limiter instance — importable from route modules for per-endpoint limits.
# Usage: from middleware.security import limiter
#        @limiter.limit("5/minute")
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None  # type: ignore[assignment]


def install_rate_limit(app: FastAPI) -> None:
    """
    Attach slowapi if available. Rate per minute is read from
    RATE_LIMIT_PER_MINUTE (default 60). Routes opt-in via the @limiter.limit
    decorator imported from app.state.limiter.
    """
    if limiter is None:
        return

    try:
        from slowapi import _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded
    except ImportError:
        return

    rpm = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60"))
    limiter._default_limits = [f"{rpm}/minute"]
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --------------------------------------------------------------------------- #
# Public bootstrap                                                            #
# --------------------------------------------------------------------------- #


def install(app: FastAPI) -> None:
    """Install the full security middleware stack on the FastAPI app."""
    # Starlette stacks middleware in LIFO order: the last add_middleware
    # call wraps the request OUTERMOST. We install CORS first (becomes
    # innermost) and security-headers second (becomes outermost). That
    # way SecurityHeadersMiddleware runs on the way back out for every
    # response, including CORS preflight short-circuit responses.
    # rate-limit only attaches state, no middleware layer.
    install_cors(app)
    install_security_headers(app)
    install_rate_limit(app)
