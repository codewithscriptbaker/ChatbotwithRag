from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.document import DocumentRecord, DocumentStatus, save_document
from app.schemas.note import NoteIngestRequest, NoteIngestResponse
from app.services.chunking_service import chunk_text
from app.services.embedding_service import embed_texts
from app.vectorstore.indexer import delete_document_chunks, upsert_chunks

router = APIRouter(tags=["notes"])


@router.post("/notes/ingest", response_model=NoteIngestResponse)
async def ingest_note(req: NoteIngestRequest):
    normalized_title = req.title.strip()
    normalized_content = req.content.strip()
    normalized_note_id = req.note_id.strip()

    if not normalized_content:
        raise HTTPException(status_code=400, detail="Note content is empty")
    if not normalized_note_id:
        raise HTTPException(status_code=400, detail="Note id is required")

    document_id = f"note_{normalized_note_id}"

    try:
        chunks = chunk_text(normalized_content)
        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks generated from note")

        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = embed_texts(chunk_texts)
        metadatas = [
            {
                "chunk_index": chunk.index,
                "token_estimate": chunk.token_estimate,
                "filename": normalized_title,
                "source_type": "note",
                "note_id": normalized_note_id,
            }
            for chunk in chunks
        ]

        # Re-index this note idempotently.
        delete_document_chunks(document_id)
        upsert_chunks(
            document_id=document_id,
            chunk_texts=chunk_texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        settings = get_settings()
        note_virtual_path = settings.upload_path / f"{document_id}.txt"
        save_document(
            DocumentRecord(
                document_id=document_id,
                filename=normalized_title,
                storage_path=Path(note_virtual_path),
                status=DocumentStatus.READY,
                chunk_count=len(chunks),
            )
        )
        return NoteIngestResponse(
            document_id=document_id,
            status=DocumentStatus.READY,
            chunk_count=len(chunks),
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to ingest note: {error}") from error
