import pytest
from fastapi import HTTPException

from routes import admin_media


class FakeUploadFile:
    def __init__(self, *, filename: str | None, content_type: str, content: bytes) -> None:
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self) -> bytes:
        return self._content


class FakeMediaCollection:
    def __init__(self) -> None:
        self.inserted: list[dict] = []

    async def insert_one(self, document: dict) -> None:
        self.inserted.append(document)


class FakeMediaDb:
    def __init__(self) -> None:
        self.media = FakeMediaCollection()


def test_media_extension_defaults_to_png_without_extension():
    assert admin_media._media_extension("hero.webp") == "webp"
    assert admin_media._media_extension("archive.final.png") == "png"
    assert admin_media._media_extension("no-extension") == "png"
    assert admin_media._media_extension(None) == "png"


@pytest.mark.asyncio
async def test_upload_media_stores_base64_document(monkeypatch):
    fake_db = FakeMediaDb()
    monkeypatch.setattr(admin_media, "db", fake_db)
    monkeypatch.setattr(admin_media.uuid, "uuid4", lambda: "media-id")

    response = await admin_media.upload_media(
        FakeUploadFile(filename="track.png", content_type="image/png", content=b"image-bytes"),
        entity_type="race",
        entity_id="australia-2026",
        admin={"email": "admin@pronokif.eu"},
    )

    assert response == {
        "id": "media-id",
        "filename": "media-id.png",
        "url": "/api/admin-bo/media/media-id/file",
    }
    assert fake_db.media.inserted[0] | {"created_at": "ignored"} == {
        "id": "media-id",
        "filename": "media-id.png",
        "original_name": "track.png",
        "content_type": "image/png",
        "size": 11,
        "data": "aW1hZ2UtYnl0ZXM=",
        "entity_type": "race",
        "entity_id": "australia-2026",
        "uploaded_by": "admin@pronokif.eu",
        "created_at": "ignored",
    }


@pytest.mark.asyncio
async def test_upload_media_rejects_unsupported_content_type():
    with pytest.raises(HTTPException) as exc:
        await admin_media.upload_media(
            FakeUploadFile(filename="payload.txt", content_type="text/plain", content=b"nope"),
            admin={"email": "admin@pronokif.eu"},
        )

    assert exc.value.status_code == 400
