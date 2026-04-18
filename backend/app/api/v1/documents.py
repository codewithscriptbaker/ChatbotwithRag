from fastapi import APIRouter, HTTPException

from app.models.document import delete_document, get_document, list_documents
from app.schemas.document import DocumentListItem, DocumentStatusResponse
from app.services.file_service import delete_upload
from app.vectorstore.indexer import delete_document_chunks

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentListItem])
async def list_all_documents():
    docs = list_documents()
    return [
        DocumentListItem(
            document_id=d.document_id,
            filename=d.filename,
            status=d.status,
            chunk_count=d.chunk_count,
        )
        for d in docs
    ]


@router.get("/documents/{document_id}", response_model=DocumentStatusResponse)
async def get_document_status(document_id: str):
    doc = get_document(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentStatusResponse(
        document_id=doc.document_id,
        filename=doc.filename,
        status=doc.status,
        chunk_count=doc.chunk_count,
        error=doc.error,
    )


@router.delete("/documents/{document_id}")
async def remove_document(document_id: str):
    doc = delete_document(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_document_chunks(document_id)
    delete_upload(doc.storage_path)

    return {"message": f"Document {document_id} deleted"}
