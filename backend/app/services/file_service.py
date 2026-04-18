import shutil
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_upload(file: UploadFile) -> str | None:
    """Return an error message if the file is invalid, else None."""
    settings = get_settings()

    if not file.filename:
        return "No filename provided"

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return f"Unsupported file type: {ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        if ext not in ALLOWED_EXTENSIONS:
            return f"Unsupported MIME type: {file.content_type}"

    if file.size and file.size > settings.max_file_bytes:
        return f"File too large: {file.size / 1024 / 1024:.1f}MB. Max: {settings.max_file_mb}MB"

    return None


async def save_upload(file: UploadFile, document_id: str) -> Path:
    settings = get_settings()
    ext = Path(file.filename or "file").suffix.lower()
    dest = settings.upload_path / f"{document_id}{ext}"

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return dest


def delete_upload(storage_path: Path) -> None:
    if storage_path.exists():
        storage_path.unlink()
