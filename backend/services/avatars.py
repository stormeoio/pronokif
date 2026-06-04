"""
PRONOKIF - Avatars service.

Catalog lookup and avatar mutation (predefined ID or base64-encoded
custom upload). Keeps the data-URL encoding out of the route handler.
"""

from __future__ import annotations

import base64

from config import db
from features import ALL_AVATARS, DEFAULT_AVATARS, DRIVER_AVATARS, TEAM_AVATARS

# Custom uploads are stored inline as a data URL. Allow up to 5 MB so users can
# upload a photo straight from their phone camera without manual resizing.
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


class AvatarError(Exception):
    """Raised on invalid avatar payloads. Routes map to 400."""


def list_catalog() -> dict:
    """Return the full avatar catalog grouped by category."""
    return {
        "default": DEFAULT_AVATARS,
        "teams": TEAM_AVATARS,
        "drivers": DRIVER_AVATARS,
        "all": ALL_AVATARS,
    }


async def set_avatar(
    user_id: str,
    *,
    avatar_id: str | None = None,
    custom_avatar_url: str | None = None,
) -> dict:
    """Switch a user to a predefined avatar or a custom URL.

    Exactly one of the two fields must be set. Returns the refreshed
    user document so the route can serialize a UserResponse.
    """
    if avatar_id:
        valid_ids = {a["id"] for a in ALL_AVATARS}
        if avatar_id not in valid_ids:
            raise AvatarError("Invalid avatar ID")
        update_data = {"avatar_id": avatar_id, "custom_avatar_url": None}
    elif custom_avatar_url:
        update_data = {
            "custom_avatar_url": custom_avatar_url,
            "avatar_id": None,
        }
    else:
        raise AvatarError("Provide avatar_id or custom_avatar_url")

    await db.users.update_one({"id": user_id}, {"$set": update_data})
    return await db.users.find_one({"id": user_id}, {"_id": 0})


async def upload_custom_avatar(user_id: str, contents: bytes, content_type: str | None) -> str:
    """Encode raw image bytes as a data URL and persist on the user.

    Returns the resulting data URL.
    """
    if len(contents) > MAX_AVATAR_BYTES:
        raise AvatarError("Image too large (max 5MB)")

    mime = content_type or "image/jpeg"
    data_url = f"data:{mime};base64,{base64.b64encode(contents).decode('utf-8')}"

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"custom_avatar_url": data_url, "avatar_id": None}},
    )
    return data_url
