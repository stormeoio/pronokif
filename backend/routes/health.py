"""
PRONOKIF - Health check endpoint.

Lightweight liveness probe for the platform layer (Docker HEALTHCHECK,
load balancer, uptime monitor). No DB hit by design — we want this to
stay green even when Mongo is degraded so the orchestrator can tell
"process is up" apart from "process can serve traffic". A separate
/readyz could be added later if the deploy story needs it.
"""

from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
    }
