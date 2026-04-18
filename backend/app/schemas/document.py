from pydantic import BaseModel


class DocumentStatusResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    chunk_count: int
    error: str | None = None


class DocumentListItem(BaseModel):
    document_id: str
    filename: str
    status: str
    chunk_count: int
