from pydantic import BaseModel


class FolderFileResult(BaseModel):
    document_id: str | None = None
    filename: str
    status: str
    chunk_count: int = 0
    error: str | None = None


class FolderCreateResponse(BaseModel):
    folder_id: str
    name: str
    system_prompt: str
    background_image_name: str | None = None
    files: list[FolderFileResult]


class FolderFileListItem(BaseModel):
    document_id: str
    filename: str
    status: str
    chunk_count: int


class FolderListItem(BaseModel):
    folder_id: str
    name: str
    system_prompt: str
    background_image_name: str | None = None
    files: list[FolderFileListItem]

