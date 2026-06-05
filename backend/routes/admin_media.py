"""
PRONOKIF - Admin Back-Office: Media Management.

Upload, list, serve and delete admin-managed media assets.
"""

from __future__ import annotations

import base64
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import db
from routes.admin_auth import get_current_admin

router = APIRouter(prefix="/admin-bo", tags=["admin-backoffice-media"])

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
# SVG removed: can embed <script> / event-handlers → stored XSS vector.
# Admin can reference external SVG URLs instead of uploading them.
MAX_MEDIA_BYTES = 5 * 1024 * 1024
DEFAULT_MEDIA_FOLDER = "general"

# Magic-byte signatures for real MIME validation (first bytes of file).
_MAGIC: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    bytes("RIFF", "ascii"): "image/webp",   # RIFF….WEBP
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}


def _detect_mime(content: bytes) -> str | None:
    """Return a validated MIME type from magic bytes, or None if unknown."""
    for sig, mime in _MAGIC.items():
        if content[: len(sig)] == sig:
            return mime
    # WebP: RIFF????WEBP
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


class MediaUpdate(BaseModel):
    folder: str | None = Field(default=None, max_length=120)
    entity_type: str | None = Field(default=None, max_length=80)
    entity_id: str | None = Field(default=None, max_length=160)


class MediaFolderRename(BaseModel):
    from_folder: str
    to_folder: str


def _media_extension(filename: str | None) -> str:
    return filename.rsplit(".", 1)[-1] if filename and "." in filename else "png"


def _normalize_media_folder(folder: str | None) -> str:
    """Normalize an admin media folder path into a canonical reusable key."""
    normalized = (folder or DEFAULT_MEDIA_FOLDER).replace("\\", "/").strip()
    parts = [part.strip() for part in normalized.split("/") if part.strip()]
    if not parts:
        return DEFAULT_MEDIA_FOLDER
    return "/".join(parts)[:120]


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity_type: Annotated[str, Form()] = "general",
    entity_id: Annotated[str, Form()] = "",
    folder: Annotated[str, Form()] = DEFAULT_MEDIA_FOLDER,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Upload a media file (image/thumbnail)."""
    # 1. Declared content-type check (fast, first gate)
    if file.content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporte: {file.content_type}. SVG non autorisé (risque XSS).",
        )

    content = await file.read()

    # 2. Size check
    if len(content) > MAX_MEDIA_BYTES:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5 Mo)")

    # 3. Magic-byte validation — prevents MIME-type spoofing
    real_mime = _detect_mime(content)
    if real_mime is None:
        raise HTTPException(status_code=400, detail="Format de fichier non reconnu (magic bytes invalides)")
    if real_mime != file.content_type:
        raise HTTPException(
            status_code=400,
            detail=f"MIME déclaré ({file.content_type}) ne correspond pas au contenu réel ({real_mime})",
        )

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{_media_extension(file.filename)}"
    normalized_folder = _normalize_media_folder(folder)

    media_doc = {
        "id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "folder": normalized_folder,
        "uploaded_by": admin["email"],
        "created_at": datetime.now(UTC).isoformat(),
    }
    await db.media.insert_one(media_doc)

    return {
        "id": file_id,
        "filename": filename,
        "folder": normalized_folder,
        "url": f"/api/admin-bo/media/{file_id}/file",
    }


@router.get("/media")
async def list_media(
    entity_type: str | None = None,
    folder: str | None = None,
    admin: dict = Depends(get_current_admin),
) -> list[dict]:
    """List all uploaded media."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if folder:
        normalized_folder = _normalize_media_folder(folder)
        if normalized_folder == DEFAULT_MEDIA_FOLDER:
            query["$or"] = [
                {"folder": DEFAULT_MEDIA_FOLDER},
                {"folder": {"$exists": False}},
                {"folder": ""},
            ]
        else:
            query["folder"] = normalized_folder
    media_items = await db.media.find(query, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(200)
    return [
        {
            **item,
            "folder": _normalize_media_folder(item.get("folder")),
        }
        for item in media_items
    ]


@router.get("/media/folders")
async def list_media_folders(admin: dict = Depends(get_current_admin)) -> list[dict]:
    """Return reusable admin media folders with asset counts."""
    media_items = await db.media.find({}, {"_id": 0, "folder": 1, "size": 1}).to_list(1000)
    folders: dict[str, dict] = {}
    for item in media_items:
        folder = _normalize_media_folder(item.get("folder"))
        folders.setdefault(folder, {"folder": folder, "count": 0, "size": 0})
        folders[folder]["count"] += 1
        folders[folder]["size"] += int(item.get("size") or 0)
    return sorted(folders.values(), key=lambda item: item["folder"])


@router.put("/media/folders/rename")
async def rename_media_folder(
    data: MediaFolderRename,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Rename a virtual media folder by moving all attached media."""
    from_folder = _normalize_media_folder(data.from_folder)
    to_folder = _normalize_media_folder(data.to_folder)
    if from_folder == to_folder:
        return {"from_folder": from_folder, "to_folder": to_folder, "matched": 0, "modified": 0}

    query = {"folder": from_folder}
    if from_folder == DEFAULT_MEDIA_FOLDER:
        query = {
            "$or": [
                {"folder": DEFAULT_MEDIA_FOLDER},
                {"folder": {"$exists": False}},
                {"folder": ""},
            ]
        }

    result = await db.media.update_many(
        query,
        {
            "$set": {
                "folder": to_folder,
                "updated_at": datetime.now(UTC).isoformat(),
                "updated_by": admin["email"],
            }
        },
    )
    return {
        "from_folder": from_folder,
        "to_folder": to_folder,
        "matched": result.matched_count,
        "modified": result.modified_count,
    }


@router.patch("/media/{media_id}")
async def update_media(
    media_id: str,
    data: MediaUpdate,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """Update admin-managed media metadata."""
    updates: dict[str, str] = {}
    if data.folder is not None:
        updates["folder"] = _normalize_media_folder(data.folder)
    if data.entity_type is not None:
        updates["entity_type"] = data.entity_type.strip() or "general"
    if data.entity_id is not None:
        updates["entity_id"] = data.entity_id.strip()
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune mise à jour fournie")

    updates["updated_at"] = datetime.now(UTC).isoformat()
    updates["updated_by"] = admin["email"]
    result = await db.media.update_one({"id": media_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return {"message": "Fichier mis à jour", "id": media_id, **updates}


@router.get("/media/{media_id}/file")
async def get_media_file(media_id: str) -> Response:
    """Serve a media file by ID."""
    media = await db.media.find_one({"id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Fichier non trouve")

    content = base64.b64decode(media["data"])
    # Content-Disposition: inline (display in browser, not download)
    # Cache: private 1h — admin media isn't public but benefits from short cache.
    # Content-Type-Options: nosniff — prevent browser MIME sniffing.
    return Response(
        content=content,
        media_type=media["content_type"],
        headers={
            "Content-Disposition": f'inline; filename="{media.get("filename", "file")}"',
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """Delete a media file."""
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return {"message": "Fichier supprime"}
