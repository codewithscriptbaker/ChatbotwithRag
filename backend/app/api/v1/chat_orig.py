import time

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.document import DocumentStatus, get_document
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.services.chat_service import build_prompt, generate_answer
from app.services.retrieval_service import retrieve

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(req: ChatRequest):
    doc = get_document(req.document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == DocumentStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Document is still being processed")
    if doc.status == DocumentStatus.FAILED:
        raise HTTPException(
            status_code=422, detail=f"Document ingestion failed: {doc.error}"
        )
    if doc.status != DocumentStatus.READY:
        raise HTTPException(status_code=409, detail=f"Document status: {doc.status}")

    start = time.perf_counter()

    chunks = retrieve(
        document_id=req.document_id,
        question=req.question,
        top_k=req.top_k,
    )

    if not chunks:
        return ChatResponse(
            answer="No relevant content found in the document for your question.",
            citations=[],
            model=get_settings().ollama_chat_model,
            latency_ms=int((time.perf_counter() - start) * 1000),
        )

    prompt = build_prompt(chunks, req.question)
    answer = await generate_answer(prompt, temperature=req.temperature)

    latency_ms = int((time.perf_counter() - start) * 1000)

    citations = [
        Citation(
            chunk_index=c.chunk_index,
            score=c.score,
            snippet=c.text[:200],
        )
        for c in chunks
    ]

    return ChatResponse(
        answer=answer,
        citations=citations,
        model=get_settings().ollama_chat_model,
        latency_ms=latency_ms,
    )
