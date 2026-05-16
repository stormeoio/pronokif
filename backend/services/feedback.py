"""
PRONOKIF - Feedback service.

Pure business logic for the feedback system, decoupled from HTTP. Lets
routes/feedback.py stay slim (validation, dependency injection, response
shaping) and gives tests a seam to write against without spinning up a
FastAPI client.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from config import db


VALID_CATEGORIES = ("bug", "suggestion", "feedback")
MAX_MESSAGE_LENGTH = 2000


class FeedbackValidationError(ValueError):
    """Raised when submitted feedback fails validation. The route layer
    converts this to a 400 Bad Request."""


def _validate(message: str, category: str) -> None:
    if not message.strip():
        raise FeedbackValidationError("Message cannot be empty")
    if len(message) > MAX_MESSAGE_LENGTH:
        raise FeedbackValidationError(
            f"Message too long (max {MAX_MESSAGE_LENGTH} characters)"
        )
    if category not in VALID_CATEGORIES:
        raise FeedbackValidationError("Invalid category")


async def submit(*, user: dict, message: str, category: str) -> dict:
    """Validate and persist a feedback entry. Returns the new row."""
    _validate(message, category)

    feedback = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "email": user.get("email"),
        "category": category,
        "message": message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.feedback.insert_one(feedback)
    return feedback


async def list_all(limit: int = 200) -> list[dict]:
    """Return the most recent feedback entries (admin view)."""
    return await (
        db.feedback.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(limit)
    )


async def mark_read(feedback_id: str) -> bool:
    """Mark a feedback row as read. Returns False if no row matched."""
    result = await db.feedback.update_one(
        {"id": feedback_id}, {"$set": {"read": True}}
    )
    return result.modified_count > 0
