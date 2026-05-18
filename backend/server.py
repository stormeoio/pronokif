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
from routes.admin_content import router as admin_content_router
from routes.admin_data import router as admin_data_router
from routes.admin_members import router as admin_members_router
from routes.admin_sync import router as admin_sync_router
from routes.auth import router as auth_router
from routes.avatars import router as avatars_router
from routes.custom_predictions import router as custom_predictions_router
from routes.drivers import router as drivers_router
from routes.feedback import router as feedback_router
from routes.health import router as health_router
from routes.leaderboards import router as leaderboards_router
from routes.leagues import router as leagues_router
from routes.minigames import router as minigames_router
from routes.notifications import router as notifications_router
from routes.predictions import router as predictions_router
from routes.profile import router as profile_router
from routes.races import router as races_router
from routes.results import router as results_router
from services.sync import auto_sync_loop

app = FastAPI(title="PRONOKIF API", description="F1 Predictions Game API")

# Mount every domain router under /api. Keep this list alphabetical so
# diffs stay clean as new domains arrive.
for _router in (
    admin_auth_router,
    admin_content_router,
    admin_data_router,
    admin_members_router,
    admin_sync_router,
    auth_router,
    avatars_router,
    custom_predictions_router,
    drivers_router,
    feedback_router,
    health_router,
    leaderboards_router,
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


# ==================== AUTO-SYNC SCHEDULER ====================
# The loop body lives in services.sync.auto_sync_loop. Lifecycle stays
# bound to the FastAPI app instance because @app.on_event needs the
# concrete app object, not a service module.
auto_sync_task: asyncio.Task | None = None


@app.on_event("startup")
async def startup_event() -> None:
    global auto_sync_task
    auto_sync_task = asyncio.create_task(auto_sync_loop())
    logger.info("[Auto-Sync] Background synchronization task started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global auto_sync_task
    if auto_sync_task is not None:
        auto_sync_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await auto_sync_task
    client.close()
