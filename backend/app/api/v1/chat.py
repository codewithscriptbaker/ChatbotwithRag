import time

from fastapi import APIRouter, HTTPException

from agents.rag_graph import run_chat_graph
from app.core.config import get_settings
from app.models.document import DocumentStatus, get_document
from app.schemas.chat import ChatRequest, ChatResponse, Citation
from app.services.chat_service import generate_answer

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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(req: ChatRequest):
    print("[API] /chat: handler entered", flush=True)
    start = time.perf_counter()

    # Generic chat mode (no document_id provided)
    if not req.document_id:
        question = (req.question or "").strip()
        if not question and req.messages:
            question = _extract_latest_user_context(req.messages)
        if not question and req.prompt:
            question = req.prompt.strip()
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")

        routed_document_id = _first_non_empty(req.document_ids)
        if routed_document_id:
            doc = get_document(routed_document_id)
            if doc is None:
                raise HTTPException(status_code=404, detail="Document not found")

            if doc.status == DocumentStatus.PROCESSING:
                raise HTTPException(
                    status_code=409, detail="Document is still being processed"
                )
            if doc.status == DocumentStatus.FAILED:
                raise HTTPException(
                    status_code=422, detail=f"Document ingestion failed: {doc.error}"
                )
            if doc.status != DocumentStatus.READY:
                raise HTTPException(
                    status_code=409, detail=f"Document status: {doc.status}"
                )

            print("[API] /chat: invoking graph (generic mode)", flush=True)
            graph_result = await run_chat_graph(
                document_id=routed_document_id,
                question=question,
                top_k=req.top_k,
                temperature=req.temperature,
            )

            chunks = graph_result.get("chunks", [])
            citations = [
                Citation(
                    chunk_index=c.chunk_index,
                    score=c.score,
                    snippet=c.text[:200],
                )
                for c in chunks
            ]

            return ChatResponse(
                answer=graph_result.get("answer", "No answer generated."),
                citations=citations,
                model=get_settings().ollama_chat_model,
                latency_ms=int((time.perf_counter() - start) * 1000),
            )

        answer = await generate_answer(question, temperature=req.temperature)
        return ChatResponse(
            answer=answer,
            citations=[],
            model=get_settings().ollama_chat_model,
            latency_ms=int((time.perf_counter() - start) * 1000),
        )

    if not req.question:
        raise HTTPException(status_code=400, detail="Question is required")

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

    print("[API] /chat: invoking graph", flush=True)

    graph_result = await run_chat_graph(
        document_id=req.document_id,
        question=req.question,
        top_k=req.top_k,
        temperature=req.temperature,
    )

    print("[API] /chat: LangGraph completed")

    print("[API] /chat: LangGraph result:", graph_result)

    chunks = graph_result.get("chunks", [])
    citations = [
        Citation(
            chunk_index=c.chunk_index,
            score=c.score,
            snippet=c.text[:200],
        )
        for c in chunks
    ]

    latency_ms = int((time.perf_counter() - start) * 1000)

    return ChatResponse(
        answer=graph_result.get("answer", "No answer generated."),
        citations=citations,
        model=get_settings().ollama_chat_model,
        latency_ms=latency_ms,
    )