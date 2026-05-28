"""
PRONOKIF - Health check endpoints.

/health  — liveness probe (no DB hit, always fast)
/readyz  — readiness probe (pings MongoDB, confirms the app can serve traffic)
"""

from datetime import UTC, datetime

from fastapi import APIRouter

from config import db, logger

router = APIRouter(tags=["health"])
root_router = APIRouter(tags=["health"])


@root_router.get("/")
async def root_check() -> dict:
    """Human-friendly API landing endpoint for direct backend visits."""
    return {
        "service": "pronokif-api",
        "status": "ok",
        "health": "/api/health",
        "docs": "/docs",
    }


@router.get("/health")
async def health_check() -> dict:
    """Liveness probe. No DB hit."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/readyz")
async def readiness_check() -> dict:
    """Readiness probe. Pings MongoDB to confirm the app can serve traffic."""
    try:
        result = await db.command("ping")
        mongo_ok = result.get("ok") == 1.0
    except Exception as exc:
        logger.warning("[Readyz] MongoDB ping failed: %s", exc)
        mongo_ok = False

    status = "ready" if mongo_ok else "not_ready"
    return {
        "status": status,
        "mongo": "ok" if mongo_ok else "down",
        "timestamp": datetime.now(UTC).isoformat(),
    }
