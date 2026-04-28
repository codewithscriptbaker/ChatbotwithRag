from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class FolderRecord:
    folder_id: str
    name: str
    system_prompt: str = ""
    background_image_name: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_folders: dict[str, FolderRecord] = {}


def save_folder(folder: FolderRecord) -> None:
    folder.updated_at = datetime.now(timezone.utc)
    _folders[folder.folder_id] = folder


def get_folder(folder_id: str) -> FolderRecord | None:
    return _folders.get(folder_id)


def list_folders() -> list[FolderRecord]:
    return sorted(_folders.values(), key=lambda f: f.created_at, reverse=True)


def delete_folder(folder_id: str) -> FolderRecord | None:
    return _folders.pop(folder_id, None)

