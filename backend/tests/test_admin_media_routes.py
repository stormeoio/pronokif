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
    def __init__(self, documents: list[dict] | None = None) -> None:
        self.inserted: list[dict] = []
        self.documents = documents or []
        self.last_query: dict | None = None
        self.last_update: dict | None = None

    async def insert_one(self, document: dict) -> None:
        self.inserted.append(document)

    def find(self, query: dict, projection: dict):
        self.last_query = query
        return FakeMediaCursor(self.documents)

    async def update_one(self, query: dict, update: dict):
        self.last_query = query
        self.last_update = update
        matched_count = 1 if any(document.get("id") == query.get("id") for document in self.documents) else 0
        return FakeUpdateResult(matched_count=matched_count, modified_count=matched_count)

    async def update_many(self, query: dict, update: dict):
        self.last_query = query
        self.last_update = update
        matched_count = len(self.documents)
        return FakeUpdateResult(matched_count=matched_count, modified_count=matched_count)


class FakeMediaCursor:
    def __init__(self, documents: list[dict]) -> None:
        self.documents = documents

    def sort(self, *args):
        return self

    async def to_list(self, limit: int) -> list[dict]:
        return self.documents[:limit]


class FakeUpdateResult:
    def __init__(self, *, matched_count: int, modified_count: int) -> None:
        self.matched_count = matched_count
        self.modified_count = modified_count


class FakeMediaDb:
    def __init__(self, documents: list[dict] | None = None) -> None:
        self.media = FakeMediaCollection(documents)


def test_media_extension_defaults_to_png_without_extension():
    assert admin_media._media_extension("hero.webp") == "webp"
    assert admin_media._media_extension("archive.final.png") == "png"
    assert admin_media._media_extension("no-extension") == "png"
    assert admin_media._media_extension(None) == "png"


def test_normalize_media_folder_keeps_canonical_path():
    assert admin_media._normalize_media_folder(None) == "general"
    assert admin_media._normalize_media_folder("  courses / monaco  ") == "courses/monaco"
    assert admin_media._normalize_media_folder("\\circuits\\street\\") == "circuits/street"


@pytest.mark.asyncio
async def test_upload_media_stores_base64_document(monkeypatch):
    fake_db = FakeMediaDb()
    monkeypatch.setattr(admin_media, "db", fake_db)
    monkeypatch.setattr(admin_media.uuid, "uuid4", lambda: "media-id")

    response = await admin_media.upload_media(
        FakeUploadFile(filename="track.png", content_type="image/png", content=b"image-bytes"),
        entity_type="race",
        entity_id="australia-2026",
        folder="courses/australia",
        admin={"email": "admin@pronokif.eu"},
    )

    assert response == {
        "id": "media-id",
        "filename": "media-id.png",
        "folder": "courses/australia",
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
        "folder": "courses/australia",
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


@pytest.mark.asyncio
async def test_list_media_filters_by_folder_and_backfills_default(monkeypatch):
    fake_db = FakeMediaDb(
        [
            {"id": "legacy", "size": 10, "entity_type": "race"},
            {"id": "new", "size": 20, "entity_type": "race", "folder": "courses/monaco"},
        ]
    )
    monkeypatch.setattr(admin_media, "db", fake_db)

    media_items = await admin_media.list_media(
        entity_type="race",
        folder="general",
        admin={"email": "admin@pronokif.eu"},
    )

    assert fake_db.media.last_query == {
        "entity_type": "race",
        "$or": [
            {"folder": "general"},
            {"folder": {"$exists": False}},
            {"folder": ""},
        ],
    }
    assert media_items[0]["folder"] == "general"
    assert media_items[1]["folder"] == "courses/monaco"


@pytest.mark.asyncio
async def test_list_media_folders_returns_counts(monkeypatch):
    fake_db = FakeMediaDb(
        [
            {"id": "one", "size": 10},
            {"id": "two", "size": 20, "folder": "courses/monaco"},
            {"id": "three", "size": 30, "folder": "courses/monaco"},
        ]
    )
    monkeypatch.setattr(admin_media, "db", fake_db)

    folders = await admin_media.list_media_folders(admin={"email": "admin@pronokif.eu"})

    assert folders == [
        {"folder": "courses/monaco", "count": 2, "size": 50},
        {"folder": "general", "count": 1, "size": 10},
    ]


@pytest.mark.asyncio
async def test_update_media_moves_file_to_folder(monkeypatch):
    fake_db = FakeMediaDb([{"id": "media-id", "folder": "general"}])
    monkeypatch.setattr(admin_media, "db", fake_db)

    response = await admin_media.update_media(
        "media-id",
        admin_media.MediaUpdate(folder=" circuits / monaco "),
        admin={"email": "admin@pronokif.eu"},
    )

    assert fake_db.media.last_query == {"id": "media-id"}
    update = fake_db.media.last_update or {}
    assert update | {"$set": update["$set"] | {"updated_at": "ignored"}} == {
        "$set": {
            "folder": "circuits/monaco",
            "updated_at": "ignored",
            "updated_by": "admin@pronokif.eu",
        }
    }
    assert response | {"updated_at": "ignored"} == {
        "message": "Fichier mis à jour",
        "id": "media-id",
        "folder": "circuits/monaco",
        "updated_at": "ignored",
        "updated_by": "admin@pronokif.eu",
    }


@pytest.mark.asyncio
async def test_rename_media_folder_updates_all_matching_media(monkeypatch):
    fake_db = FakeMediaDb([{"id": "one"}, {"id": "two"}])
    monkeypatch.setattr(admin_media, "db", fake_db)

    response = await admin_media.rename_media_folder(
        admin_media.MediaFolderRename(from_folder="general", to_folder="archives/old"),
        admin={"email": "admin@pronokif.eu"},
    )

    assert fake_db.media.last_query == {
        "$or": [
            {"folder": "general"},
            {"folder": {"$exists": False}},
            {"folder": ""},
        ]
    }
    assert fake_db.media.last_update["$set"] | {"updated_at": "ignored"} == {
        "folder": "archives/old",
        "updated_at": "ignored",
        "updated_by": "admin@pronokif.eu",
    }
    assert response == {
        "from_folder": "general",
        "to_folder": "archives/old",
        "matched": 2,
        "modified": 2,
    }
