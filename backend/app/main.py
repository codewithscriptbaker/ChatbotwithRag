from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.upload import router as upload_router
from app.api.v1.documents import router as documents_router
from app.api.v1.chat import router as chat_router
from app.api.v1.transcribe import router as transcribe_router
from app.api.v1.notes import router as notes_router
from app.api.v1.folders import router as folders_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.embedding_service import get_embedding_model
    from app.services.transcribe_service import get_whisperx_model
    from app.vectorstore.client import get_chroma_client

    get_embedding_model()
    get_whisperx_model()
    get_chroma_client()
    print("[startup] Embedding model, WhisperX, and ChromaDB ready")
    yield


app = FastAPI(
    title="ChatGPT-Lite RAG Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(transcribe_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")
app.include_router(folders_router, prefix="/api/v1")
