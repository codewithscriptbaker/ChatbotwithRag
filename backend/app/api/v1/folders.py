import asyncio

import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import get_settings
from app.models.document import (
    DocumentRecord,
    DocumentStatus,
    delete_document,
    list_documents,
    save_document,
)
from app.models.folder import FolderRecord, delete_folder, get_folder, list_folders, save_folder
from app.schemas.chat import ChatResponse, Citation
from app.schemas.folder import (
    FolderCreateResponse,
    FolderFileListItem,
    FolderFileResult,
    FolderListItem,
)
from app.services.chat_service import build_prompt, generate_answer
from app.services.file_service import delete_upload, save_upload, validate_upload
from app.services.ingestion_service import run_ingestion
from app.services.retrieval_service import retrieve_by_folder
from app.utils.ids import generate_id
from app.vectorstore.indexer import delete_document_chunks

router = APIRouter(tags=["folders"])


@router.post("/folders", response_model=FolderCreateResponse)
async def create_folder_with_files(
    folder_name: str = Form(...),
    system_prompt: str = Form(""),
    background_image: UploadFile | None = File(default=None),
    files: list[UploadFile] = File(default=[]),
):
    normalized_name = folder_name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    folder_id = generate_id()
    folder = FolderRecord(
        folder_id=folder_id,
        name=normalized_name,
        system_prompt=system_prompt.strip(),
        background_image_name=background_image.filename if background_image else None,
    )
    save_folder(folder)

    file_results: list[FolderFileResult] = []
    for file in files:
        error = validate_upload(file)
        if error:
            file_results.append(
                FolderFileResult(
                    filename=file.filename or "unknown",
                    status="failed",
                    error=error,
                )
            )
            continue

        document_id = generate_id()
        storage_path = await save_upload(file, document_id)
        doc = DocumentRecord(
            document_id=document_id,
            filename=file.filename or "unknown",
            storage_path=storage_path,
            folder_id=folder_id,
        )
        save_document(doc)

        try:
            await asyncio.to_thread(run_ingestion, document_id)
        except Exception:
            from app.models.document import get_document

            failed_doc = get_document(document_id)
            file_results.append(
                FolderFileResult(
                    document_id=document_id,
                    filename=file.filename or "unknown",
                    status=failed_doc.status if failed_doc else "failed",
                    chunk_count=failed_doc.chunk_count if failed_doc else 0,
                    error=failed_doc.error if failed_doc else "Unknown error",
                )
            )
            continue

        from app.models.document import get_document

        ingested_doc = get_document(document_id)
        file_results.append(
            FolderFileResult(
                document_id=document_id,
                filename=file.filename or "unknown",
                status=ingested_doc.status if ingested_doc else "ready",
                chunk_count=ingested_doc.chunk_count if ingested_doc else 0,
            )
        )

    return FolderCreateResponse(
        folder_id=folder.folder_id,
        name=folder.name,
        system_prompt=folder.system_prompt,
        background_image_name=folder.background_image_name,
        files=file_results,
    )


@router.get("/folders", response_model=list[FolderListItem])
async def list_all_folders():
    folders = list_folders()
    response: list[FolderListItem] = []
    for folder in folders:
        docs = list_documents(folder_id=folder.folder_id)
        response.append(
            FolderListItem(
                folder_id=folder.folder_id,
                name=folder.name,
                system_prompt=folder.system_prompt,
                background_image_name=folder.background_image_name,
                files=[
                    FolderFileListItem(
                        document_id=doc.document_id,
                        filename=doc.filename,
                        status=doc.status,
                        chunk_count=doc.chunk_count,
                    )
                    for doc in docs
                ],
            )
        )
    return response


@router.delete("/folders/{folder_id}")
async def remove_folder(folder_id: str):
    folder = get_folder(folder_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    docs = list_documents(folder_id=folder_id)
    for doc in docs:
        deleted = delete_document(doc.document_id)
        if deleted is None:
            continue
        delete_document_chunks(doc.document_id)
        delete_upload(doc.storage_path)

    delete_folder(folder_id)
    return {"message": f"Folder {folder_id} deleted"}


@router.post("/folders/{folder_id}/chat", response_model=ChatResponse)
async def chat_with_folder(
    folder_id: str,
    question: str = Form(...),
    top_k: int = Form(default=5),
    temperature: float = Form(default=0.2),
):
    folder = get_folder(folder_id)
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")

    docs = list_documents(folder_id=folder_id)
    if not docs:
        return ChatResponse(
            answer="This folder has no uploaded documents yet.",
            citations=[],
            model=get_settings().ollama_chat_model,
            latency_ms=0,
        )

    if any(doc.status == DocumentStatus.PROCESSING for doc in docs):
        raise HTTPException(status_code=409, detail="Folder documents are still processing")

    if all(doc.status != DocumentStatus.READY for doc in docs):
        raise HTTPException(status_code=422, detail="No ready documents found in this folder")

    start = time.perf_counter()
    chunks = retrieve_by_folder(folder_id=folder_id, question=question, top_k=top_k)
    if not chunks:
        return ChatResponse(
            answer="No relevant content found in this folder for your question.",
            citations=[],
            model=get_settings().ollama_chat_model,
            latency_ms=int((time.perf_counter() - start) * 1000),
        )

    prompt = build_prompt(chunks, question)
    answer = await generate_answer(prompt, temperature=temperature)
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
        latency_ms=int((time.perf_counter() - start) * 1000),
    )

