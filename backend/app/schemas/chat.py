from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    # RAG mode inputs
    document_id: str | None = None
    document_ids: list[str] | None = None
    question: str | None = Field(default=None, min_length=1)

    # Generic chat mode inputs (proxied from Next.js /api/chat)
    prompt: str | None = Field(default=None, min_length=1)
    messages: list[dict[str, Any]] | None = None

    # Shared generation settings
    top_k: int = Field(default=5, ge=1, le=20)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class Citation(BaseModel):
    chunk_index: int
    score: float
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    model: str
    latency_ms: int
