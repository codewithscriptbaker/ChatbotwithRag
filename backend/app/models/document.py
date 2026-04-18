from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path


class DocumentStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


@dataclass
class DocumentRecord:
    document_id: str
    filename: str
    storage_path: Path
    folder_id: str | None = None
    status: DocumentStatus = DocumentStatus.QUEUED
    chunk_count: int = 0
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# Lightweight in-memory registry. Replace with a DB table when you need persistence
# across restarts.
_documents: dict[str, DocumentRecord] = {}


def save_document(doc: DocumentRecord) -> None:
    doc.updated_at = datetime.now(timezone.utc)
    _documents[doc.document_id] = doc


def get_document(document_id: str) -> DocumentRecord | None:
    return _documents.get(document_id)


def list_documents(folder_id: str | None = None) -> list[DocumentRecord]:
    docs = _documents.values()
    if folder_id is not None:
        docs = [d for d in docs if d.folder_id == folder_id]
    return sorted(docs, key=lambda d: d.created_at, reverse=True)


def delete_document(document_id: str) -> DocumentRecord | None:
    return _documents.pop(document_id, None)
