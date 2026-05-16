"""
PRONOKIF - Notifications routes.

POST /admin/notifications              — admin only (broadcast)
GET  /notifications                    — any authenticated user
GET  /notifications/unread-count       — any authenticated user
PUT  /notifications/{id}/read          — any authenticated user
PUT  /notifications/read-all           — any authenticated user

The router has no path prefix; server.py mounts it under /api so the
paths above end up as /api/notifications/... and /api/admin/notifications.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from services import notifications as notifications_service
from services.admin import require_admin
from services.auth import get_current_user

router = APIRouter(tags=["notifications"])


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # info, update, important


@router.post("/admin/notifications")
async def create_notification(data: NotificationCreate, admin: dict = Depends(require_admin)) -> dict:
    """Create and broadcast a notification to all users (admin only)."""
    try:
        notification = await notifications_service.create(
            title=data.title,
            message=data.message,
            ntype=data.type,
            author=admin,
        )
    except notifications_service.NotificationValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "message": "Notification sent to all users",
        "id": notification["id"],
    }


@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)) -> list[dict]:
    """List notifications with per-user read status."""
    return await notifications_service.list_for_user(user)


@router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)) -> dict:
    """Return count of unread notifications for the current user."""
    return {"count": await notifications_service.count_unread(user)}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Mark a single notification as read."""
    await notifications_service.mark_read(user, notification_id)
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)) -> dict:
    """Mark all notifications as read for the current user."""
    await notifications_service.mark_all_read(user)
    return {"message": "All notifications marked as read"}
