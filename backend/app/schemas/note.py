from pydantic import BaseModel, Field


class NoteIngestRequest(BaseModel):
    note_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)


class NoteIngestResponse(BaseModel):
    document_id: str
    status: str
    chunk_count: int
