"""
PRONOKIF - FastAPI application entry point.

Pure orchestration: build the FastAPI app, wire every route module
(see backend/routes/), install the security middleware stack
(see backend/middleware/security.py), and own the auto-sync background
task lifecycle. All business logic lives in services/ + repositories.

This module deliberately stays under 100 lines. If you find yourself
adding a handler here, route it through a module under routes/ instead.
"""

from __future__ import annotations

import asyncio
import contextlib
import os

from fastapi import FastAPI
from starlette.requests import Request as StarletteRequest
import sentry_sdk

from config import client, logger

# ── Sentry error monitoring (no-op if SENTRY_DSN is unset) ──────────
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=os.environ.get("ENVIRONMENT", "production"),
        release=f"pronokif-backend@{os.environ.get('APP_VERSION', 'dev')}",
        traces_sample_rate=0.2,
        send_default_pii=False,
        # FastAPI integration is auto-discovered
    )
    logger.info("[Sentry] Initialized — error tracking active")
from middleware.security import install as install_security

# Route modules — one router per business domain.
from routes.admin_auth import router as admin_auth_router
from routes.admin_activity_logs import router as admin_activity_logs_router
from routes.admin_championships import router as admin_championships_router
from routes.admin_content import router as admin_content_router
from routes.admin_drivers import router as admin_drivers_router
from routes.admin_feedbacks import router as admin_feedbacks_router
from routes.admin_invitations import router as admin_invitations_router
from routes.admin_knowledge import router as admin_knowledge_router
from routes.admin_legal_pages import router as admin_legal_pages_router
from routes.admin_leagues import router as admin_leagues_router
from routes.admin_members import router as admin_members_router
from routes.admin_media import router as admin_media_router
from routes.admin_predictions import router as admin_predictions_router
from routes.admin_races import router as admin_races_router
from routes.admin_settings import public_router as app_settings_router
from routes.admin_settings import router as admin_settings_router
from routes.admin_sync import router as admin_sync_router
from routes.admin_translations import router as admin_translations_router
from routes.admin_users import router as admin_users_router
from routes.auth import router as auth_router
from routes.avatars import router as avatars_router
from routes.custom_predictions import router as custom_predictions_router
from routes.drivers import router as drivers_router
from routes.feedback import router as feedback_router
from routes.health import root_router, router as health_router
from routes.leaderboards import router as leaderboards_router
from routes.legal import router as legal_router
from routes.leagues import router as leagues_router
from routes.minigames import router as minigames_router
from routes.notifications import router as notifications_router
from routes.predictions import router as predictions_router
from routes.profile import router as profile_router
from routes.races import router as races_router
from routes.results import router as results_router
from services.email import get_smtp_settings
from services.indexes import ensure_indexes
from services.sync import auto_sync_loop

# ==================== AUTO-SYNC SCHEDULER ====================
# The loop body lives in services.sync.auto_sync_loop. Lifecycle stays
# bound to the FastAPI app instance through lifespan.
auto_sync_task: asyncio.Task | None = None


async def _await_database_ready(attempts: int = 20, base_delay: float = 1.0) -> None:
    """Block until MongoDB answers a ping, retrying with capped backoff.

    A host reboot (or `docker compose up`) can start the API before MongoDB is
    accepting connections. Without this, the lifespan's ``ensure_indexes()``
    raises ``ServerSelectionTimeoutError`` on the first call and the app
    crash-loops — made tighter by the 5s ``serverSelectionTimeoutMS``. Retry so
    the API waits for the DB instead of dying at boot.
    """
    delay = base_delay
    for attempt in range(1, attempts + 1):
        try:
            await client.admin.command("ping")
            if attempt > 1:
                logger.info("[MongoDB] reachable after %d attempt(s)", attempt)
            return
        except Exception as exc:  # noqa: BLE001 — any connection error should retry at boot
            if attempt == attempts:
                logger.error("[MongoDB] unreachable after %d attempts: %s", attempts, exc)
                raise
            logger.warning(
                "[MongoDB] not ready (attempt %d/%d: %s); retrying in %.1fs",
                attempt,
                attempts,
                type(exc).__name__,
                delay,
            )
            await asyncio.sleep(delay)
            delay = min(delay * 2, 5.0)


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    global auto_sync_task
    await _await_database_ready()
    await ensure_indexes()
    smtp_settings = get_smtp_settings()
    if smtp_settings:
        logger.info(
            "[Email] SMTP enabled host=%s port=%s from=%s tls=%s ssl=%s",
            smtp_settings.host,
            smtp_settings.port,
            smtp_settings.from_email,
            smtp_settings.use_tls,
            smtp_settings.use_ssl,
        )
    else:
        logger.warning("[Email] SMTP disabled: SMTP_HOST is not configured")
    auto_sync_task = asyncio.create_task(auto_sync_loop())
    logger.info("[Auto-Sync] Background synchronization task started")

    try:
        yield
    finally:
        if auto_sync_task is not None:
            auto_sync_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await auto_sync_task
            auto_sync_task = None
        client.close()


app = FastAPI(
    title="PRONOKIF API",
    description="F1 Predictions Game API",
    lifespan=lifespan,
)

app.include_router(root_router)


# ── CSP violation report endpoint ─────────────────────────────────────────
# Receives JSON reports from browsers when Content-Security-Policy-Report-Only
# fires. Logged to stdout so Dokploy/StormDeploy picks them up. Remove or
# restrict once enforcement mode is active.
import json as _json
import logging as _logging

_csp_log = _logging.getLogger("csp.violations")


@app.post("/api/csp-report", status_code=204, include_in_schema=False)
async def csp_report(request: StarletteRequest):
    try:
        body = await request.json()
        _csp_log.warning("CSP violation: %s", _json.dumps(body))
    except Exception:
        pass

# Mount every domain router under /api. Keep this list alphabetical so
# diffs stay clean as new domains arrive.
for _router in (
    admin_auth_router,
    admin_activity_logs_router,
    admin_championships_router,
    admin_content_router,
    admin_drivers_router,
    admin_feedbacks_router,
    admin_invitations_router,
    admin_knowledge_router,
    admin_legal_pages_router,
    admin_leagues_router,
    admin_members_router,
    admin_media_router,
    admin_predictions_router,
    admin_races_router,
    admin_settings_router,
    admin_sync_router,
    admin_translations_router,
    admin_users_router,
    app_settings_router,
    auth_router,
    avatars_router,
    custom_predictions_router,
    drivers_router,
    feedback_router,
    health_router,
    leaderboards_router,
    legal_router,
    leagues_router,
    minigames_router,
    notifications_router,
    predictions_router,
    profile_router,
    races_router,
    results_router,
):
    app.include_router(_router, prefix="/api")

# Security stack: strict CORS, security response headers, opt-in slowapi
# rate limiting. See backend/middleware/security.py.
install_security(app)
