"""
PRONOKIF - Admin authorization helpers.

Centralizes the "is this user an admin?" check that used to live as a
free function inside server.py. Exposes both the raw predicate and a
FastAPI dependency so route handlers can declare admin-only access
declaratively:

    from services.admin import require_admin

    @router.get("/admin/something")
    async def handler(user=Depends(require_admin)):
        ...

The legacy `check_is_admin(user)` predicate is kept for handlers that
need to branch on admin status mid-flow (e.g. add fields only when the
caller is admin) rather than gate the whole endpoint.
"""

from __future__ import annotations

import os

from fastapi import Depends, HTTPException, status

from services.auth import get_current_user

# Admin identity is keyed by email today. Override via env so staging /
# prod can have a different operator without code changes.
# Supports comma-separated list for multiple admins.
ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.environ.get(
        "ADMIN_EMAILS",
        os.environ.get("ADMIN_EMAIL", "catalan.baptiste123@gmail.com,baptiste.catalan123@gmail.com,fred@stormeo.io"),
    ).split(",")
]


async def check_is_admin(user: dict) -> bool:
    """Return True when the given user dict belongs to an admin account."""
    if not user:
        return False
    return user.get("email", "").lower() in ADMIN_EMAILS


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency that 403s when the caller is not the admin."""
    if not await check_is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
