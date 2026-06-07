"""
PRONOKIF - Feedback service.

Pure business logic for the feedback system, decoupled from HTTP. Lets
routes/feedback.py stay slim (validation, dependency injection, response
shaping) and gives tests a seam to write against without spinning up a
FastAPI client.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from config import db

VALID_CATEGORIES = ("bug", "suggestion", "feedback")
MAX_MESSAGE_LENGTH = 2000

# Screenshots are stored inline as base64 data URLs on the feedback document.
# Bounds keep us safely under MongoDB's 16 MB BSON document limit.
MAX_SCREENSHOTS = 3
MAX_SCREENSHOT_CHARS = 2_800_000  # ~2 MB raw image once base64-decoded


class FeedbackValidationError(ValueError):
    """Raised when submitted feedback fails validation. The route layer
    converts this to a 400 Bad Request."""


def _validate(message: str, category: str) -> None:
    if not message.strip():
        raise FeedbackValidationError("Message cannot be empty")
    if len(message) > MAX_MESSAGE_LENGTH:
        raise FeedbackValidationError(f"Message too long (max {MAX_MESSAGE_LENGTH} characters)")
    if category not in VALID_CATEGORIES:
        raise FeedbackValidationError("Invalid category")


def _clean_screenshots(screenshots: list[str] | None) -> list[str]:
    """Validate + normalize uploaded screenshots (base64 image data URLs)."""
    if not screenshots:
        return []
    if len(screenshots) > MAX_SCREENSHOTS:
        raise FeedbackValidationError(f"Too many screenshots (max {MAX_SCREENSHOTS})")
    cleaned: list[str] = []
    for shot in screenshots:
        if not isinstance(shot, str) or not shot.startswith("data:image/"):
            raise FeedbackValidationError("Invalid screenshot format")
        if len(shot) > MAX_SCREENSHOT_CHARS:
            raise FeedbackValidationError("Screenshot too large (max 2 MB each)")
        cleaned.append(shot)
    return cleaned


async def submit(
    *, user: dict, message: str, category: str, screenshots: list[str] | None = None
) -> dict:
    """Validate and persist a feedback entry. Returns the new row."""
    _validate(message, category)
    clean_shots = _clean_screenshots(screenshots)

    feedback = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user.get("username", "Anonymous"),
        "email": user.get("email"),
        "category": category,
        "message": message.strip(),
        "screenshots": clean_shots,
        "screenshot_count": len(clean_shots),
        "created_at": datetime.now(UTC).isoformat(),
        "read": False,
    }
    await db.feedback.insert_one(feedback)
    return feedback


async def list_all(limit: int = 200) -> list[dict]:
    """Return the most recent feedback entries (admin view)."""
    return await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)


async def mark_read(feedback_id: str) -> bool:
    """Mark a feedback row as read. Returns False if no row matched."""
    result = await db.feedback.update_one({"id": feedback_id}, {"$set": {"read": True}})
    return result.modified_count > 0
