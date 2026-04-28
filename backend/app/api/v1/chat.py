import time
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from agents.rag_graph import run_chat_graph, run_chat_graph_stream
from app.core.config import get_settings
from app.models.document import DocumentStatus, get_document
from app.schemas.chat import ChatRequest, ChatResponse, Citation

router = APIRouter(tags=["chat"])


_MAX_DOC_CHARS = 12000
_MAX_TOTAL_CHARS = 16000


def _first_non_empty(values: list[str] | None) -> str | None:
    if not values:
        return None
    for value in values:
        cleaned = value.strip()
        if cleaned:
            return cleaned
    return None


def _extract_latest_user_context(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") != "user":
            continue

        parts = message.get("parts")
        if not isinstance(parts, list):
            continue

        segments: list[str] = []
        for part in parts:
            if not isinstance(part, dict):
                continue

            part_type = part.get("type")

            if part_type == "text" and isinstance(part.get("text"), str):
                text = part["text"].strip()
                if text:
                    segments.append(text)
                continue

            if part_type == "data-document" and isinstance(part.get("data"), dict):
                data = part["data"]
                name = str(data.get("name") or "Unknown document")
                mime = str(data.get("mimeType") or "unknown")
                content = str(data.get("content") or "").strip()
                if content:
                    limited = content[:_MAX_DOC_CHARS]
                    segments.append(f"[Document: {name} | {mime}]\n{limited}")
                else:
                    segments.append(f"[Document attached: {name} | {mime}]")
                continue

            if part_type == "file":
                filename = str(part.get("filename") or "attachment")
                media_type = str(part.get("mediaType") or "unknown")
                segments.append(f"[File attached: {filename} | {media_type}]")

        context = "\n\n".join(s for s in segments if s)
        if context:
            return context[:_MAX_TOTAL_CHARS]
    return ""


def _extract_latest_user_text(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") != "user":
            continue

        parts = message.get("parts")
        if not isinstance(parts, list):
            continue

        texts: list[str] = []
        for part in parts:
            if not isinstance(part, dict):
                continue
            if part.get("type") != "text":
                continue
            if not isinstance(part.get("text"), str):
                continue
            text = part["text"].strip()
            if text:
                texts.append(text)

        if texts:
            return "\n\n".join(texts)[:_MAX_TOTAL_CHARS]
    return ""


def _has_attached_note(messages: list[dict] | None) -> bool:
    if not messages:
        return False
    for message in reversed(messages):
        if message.get("role") != "user":
            continue
        parts = message.get("parts")
        if not isinstance(parts, list):
            continue
        for part in parts:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "data-document":
                return True
    return False


def _resolve_question(req: ChatRequest) -> str:
    q = (req.question or "").strip()
    if q:
        return q
    if req.messages:
        q = _extract_latest_user_context(req.messages)
        if q:
            return q
    if req.prompt:
        return req.prompt.strip()
    return ""


def _resolve_user_query(req: ChatRequest, question: str) -> str:
    user_query = (req.question or "").strip()
    if not user_query and req.messages:
        user_query = _extract_latest_user_text(req.messages)
    if not user_query and req.prompt:
        user_query = req.prompt.strip()
    if not user_query:
        user_query = question
    return user_query


def _resolve_effective_document_id(req: ChatRequest) -> str | None:
    if req.document_id and str(req.document_id).strip():
        return str(req.document_id).strip()
    return _first_non_empty(req.document_ids)


def _validate_document_ready(document_id: str) -> None:
    doc = get_document(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == DocumentStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Document is still being processed")
    if doc.status == DocumentStatus.FAILED:
        raise HTTPException(status_code=422, detail=f"Document ingestion failed: {doc.error}")
    if doc.status != DocumentStatus.READY:
        raise HTTPException(status_code=409, detail=f"Document status: {doc.status}")


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(req: ChatRequest):
    print("[API] /chat: handler entered", flush=True)
    start = time.perf_counter()

    question = _resolve_question(req)
    print(f'\n\n user query question \n\n {question} \n\n')
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    user_query = _resolve_user_query(req, question)

    has_attached_note = _has_attached_note(req.messages)

    effective_document_id = _resolve_effective_document_id(req)

    if effective_document_id:
        _validate_document_ready(effective_document_id)

    print("[API] /chat: invoking graph", flush=True)
    graph_result = await run_chat_graph(
        document_id=effective_document_id,
        question=question,
        user_query=user_query,
        has_attached_note=has_attached_note,
        top_k=req.top_k,
        temperature=req.temperature,
    )

    # print("[API] /chat: LangGraph completed", flush=True)
    # print("[API] /chat: LangGraph result:", graph_result, flush=True)

    chunks = graph_result.get("chunks") or []

    # print(f'\n\n graph result \n\n {graph_result} \n\n')
    citations = [
        Citation(
            chunk_index=c.chunk_index,
            score=c.score,
            snippet=c.text[:200],
        )
        for c in chunks
    ]

    # print(f'\n\n citations \n\n {citations} \n\n')
    latency_ms = int((time.perf_counter() - start) * 1000)

    return ChatResponse(
        answer=graph_result.get("answer", "No answer generated."),
        citations=citations,
        model=get_settings().ollama_chat_model,
        latency_ms=latency_ms,
    )


@router.post("/chat/stream")
async def chat_with_document_stream(req: ChatRequest):
    question = _resolve_question(req)
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    user_query = _resolve_user_query(req, question)
    has_attached_note = _has_attached_note(req.messages)
    effective_document_id = _resolve_effective_document_id(req)
    if effective_document_id:
        _validate_document_ready(effective_document_id)

    async def event_stream():
        async for event in run_chat_graph_stream(
            document_id=effective_document_id,
            question=question,
            user_query=user_query,
            has_attached_note=has_attached_note,
            top_k=req.top_k,
            temperature=req.temperature,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")