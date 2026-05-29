"""
PRONOKIF - Admin Back-Office: Media Management.

Upload, list, serve and delete admin-managed media assets.
"""

from __future__ import annotations

import base64
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from config import db
from routes.admin_auth import get_current_admin

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-media"])

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"}
MAX_MEDIA_BYTES = 5 * 1024 * 1024


def _media_extension(filename: str | None) -> str:
    return filename.rsplit(".", 1)[-1] if filename and "." in filename else "png"


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity_type: str = "general",
    entity_id: str = "",
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Upload a media file (image/thumbnail)."""
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporte: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_MEDIA_BYTES:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{_media_extension(file.filename)}"

    media_doc = {
        "id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "uploaded_by": admin["email"],
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.media.insert_one(media_doc)

    return {"id": file_id, "filename": filename, "url": f"/api/admin-bo/media/{file_id}/file"}


@router.get("/media")
async def list_media(
    entity_type: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all uploaded media."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    return await db.media.find(query, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(200)


@router.get("/media/{media_id}/file")
async def get_media_file(media_id: str) -> Response:
    """Serve a media file by ID."""
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Fichier non trouve")

    content = base64.b64decode(media["data"])
    return Response(content=content, media_type=media["content_type"])


@router.delete("/media/{media_id}")
async def delete_media(
    media_id: str, admin: dict = Depends(get_current_admin)
) -> dict:
    """Delete a media file."""
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return {"message": "Fichier supprime"}
