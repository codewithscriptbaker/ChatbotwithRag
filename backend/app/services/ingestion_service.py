from pathlib import Path

from app.models.document import DocumentRecord, DocumentStatus, get_document, save_document
from app.services.chunking_service import chunk_text
from app.services.embedding_service import embed_texts
from app.services.parsing_service import extract_text
from app.vectorstore.indexer import upsert_chunks


def run_ingestion(document_id: str) -> None:
    """Full ingestion pipeline: parse -> chunk -> embed -> store vectors."""

    doc = get_document(document_id)
    if doc is None:
        raise ValueError(f"Document {document_id} not found")

    doc.status = DocumentStatus.PROCESSING
    save_document(doc)

    try:
        full_text = extract_text(doc.storage_path)
        if not full_text.strip():
            raise ValueError("Extracted text is empty")

        chunks = chunk_text(full_text)
        if not chunks:
            raise ValueError("No chunks generated from text")

        chunk_texts = [c.text for c in chunks]
        embeddings = embed_texts(chunk_texts)

        metadatas = [
            {
                "chunk_index": c.index,
                "token_estimate": c.token_estimate,
                "filename": doc.filename,
                "folder_id": doc.folder_id,
            }
            for c in chunks
        ]

        upsert_chunks(
            document_id=document_id,
            chunk_texts=chunk_texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        doc.chunk_count = len(chunks)
        doc.status = DocumentStatus.READY
        save_document(doc)

        print(f"[ingest] Document {document_id} ready ({len(chunks)} chunks)")

    except Exception as e:
        doc.status = DocumentStatus.FAILED
        doc.error = str(e)
        save_document(doc)
        print(f"[ingest] Document {document_id} failed: {e}")
        raise
