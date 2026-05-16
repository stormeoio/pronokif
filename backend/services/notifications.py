"""
PRONOKIF - Notifications service.

Pure business logic for the global notifications system. Notifications
are broadcast to all users; per-user read state is tracked via the
`unread_notifications` array on the user document.

The route layer stays slim: it validates payloads, injects the current
user via FastAPI dependencies, and turns service-level exceptions into
HTTP responses.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from config import db

VALID_TYPES = ("info", "update", "important")
MAX_LIST_LIMIT = 50


class NotificationValidationError(ValueError):
    """Raised when a notification payload fails validation. The route
    layer converts this into a 400 Bad Request."""


def _validate(title: str, message: str, ntype: str) -> None:
    if not title.strip() or not message.strip():
        raise NotificationValidationError("Title and message cannot be empty")
    if ntype not in VALID_TYPES:
        raise NotificationValidationError("Invalid notification type")


async def create(*, title: str, message: str, ntype: str, author: dict) -> dict:
    """Validate, persist, and broadcast a notification to all users.

    Adds the new notification id to every user's `unread_notifications`
    array so each user sees it as unread until they explicitly mark it
    as read.
    """
    _validate(title, message, ntype)

    notification = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "message": message.strip(),
        "type": ntype,
        "created_at": datetime.now(UTC).isoformat(),
        "created_by": author["id"],
    }

    await db.notifications.insert_one(notification)
    await db.users.update_many({}, {"$addToSet": {"unread_notifications": notification["id"]}})
    return notification


async def list_for_user(user: dict, limit: int = MAX_LIST_LIMIT) -> list[dict]:
    """Return the most recent notifications, decorated with per-user
    `is_read` status."""
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)

    user_doc = await db.users.find_one({"id": user["id"]}, {"unread_notifications": 1})
    unread_ids = set((user_doc or {}).get("unread_notifications", []))

    for notif in notifications:
        notif["is_read"] = notif["id"] not in unread_ids
    return notifications


async def count_unread(user: dict) -> int:
    """Return the count of unread notifications for the given user."""
    user_doc = await db.users.find_one({"id": user["id"]}, {"unread_notifications": 1})
    return len((user_doc or {}).get("unread_notifications", []))


async def mark_read(user: dict, notification_id: str) -> None:
    """Mark a single notification as read for the given user."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"unread_notifications": notification_id}},
    )


async def mark_all_read(user: dict) -> None:
    """Clear the user's unread notifications list."""
    await db.users.update_one({"id": user["id"]}, {"$set": {"unread_notifications": []}})
