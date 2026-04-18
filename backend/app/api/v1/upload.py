import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.document import DocumentRecord, DocumentStatus, save_document
from app.schemas.upload import UploadResponse
from app.services.file_service import save_upload, validate_upload
from app.services.ingestion_service import run_ingestion
from app.utils.ids import generate_id

router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    error = validate_upload(file)
    if error:
        raise HTTPException(status_code=400, detail=error)

    document_id = generate_id()

    storage_path = await save_upload(file, document_id)

    doc = DocumentRecord(
        document_id=document_id,
        filename=file.filename or "unknown",
        storage_path=storage_path,
        status=DocumentStatus.QUEUED,
    )
    save_document(doc)

    # Run ingestion synchronously in a thread so the upload response waits
    # until the document is fully indexed. For large files, switch this to
    # a background task queue (Celery/RQ).
    try:
        await asyncio.to_thread(run_ingestion, document_id)
    except Exception:
        from app.models.document import get_document

        doc = get_document(document_id)
        return UploadResponse(
            document_id=document_id,
            filename=file.filename or "unknown",
            status=doc.status if doc else "failed",
            chunk_count=0,
            message=f"Ingestion failed: {doc.error if doc else 'unknown error'}",
        )

    from app.models.document import get_document

    doc = get_document(document_id)
    return UploadResponse(
        document_id=document_id,
        filename=file.filename or "unknown",
        status=doc.status if doc else "ready",
        chunk_count=doc.chunk_count if doc else 0,
        message="File uploaded and indexed successfully",
    )
