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


async def list_catalog() -> dict:
    """Return the full avatar catalog grouped by category.

    Driver entries are enriched with ``photo_url`` and ``team_logo_url``
    from the ``drivers`` MongoDB collection (populated by the admin seed).
    Falls back to static data gracefully when the collection is empty.
    The frontend renders these as Pronokif-branded pilot avatars:
    real F1 headshot framed with team-color ring + race-number badge.
    """
    # Fetch all drivers with media fields
    driver_docs = await db.drivers.find(
        {},
        {"_id": 0, "id": 1, "photo_url": 1, "team_logo_url": 1, "number": 1},
    ).to_list(length=100)

    # Build number → doc lookup (DRIVER_AVATARS keys by race number)
    by_number: dict[int, dict] = {
        int(d["number"]): d for d in driver_docs if d.get("photo_url") and d.get("number") is not None
    }

    enriched_drivers = []
    for av in DRIVER_AVATARS:
        entry = dict(av)
        doc = by_number.get(int(av.get("number", -1) or -1))
        if doc:
            entry["photo_url"] = doc["photo_url"]
            if doc.get("team_logo_url"):
                entry["team_logo_url"] = doc["team_logo_url"]
        enriched_drivers.append(entry)

    enriched_all = [a for a in ALL_AVATARS if a.get("category") != "drivers"] + enriched_drivers

    return {
        "default": DEFAULT_AVATARS,
        "teams": TEAM_AVATARS,
        "drivers": enriched_drivers,
        "all": enriched_all,
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
