from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def liveness():
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness():
    from app.services.embedding_service import get_embedding_model
    from app.services.transcribe_service import get_whisperx_model
    from app.vectorstore.client import get_chroma_client

    checks = {}

    try:
        get_chroma_client().heartbeat()
        checks["chromadb"] = "ok"
    except Exception as e:
        checks["chromadb"] = str(e)

    try:
        get_embedding_model()
        checks["embedding_model"] = "ok"
    except Exception as e:
        checks["embedding_model"] = str(e)

    try:
        get_whisperx_model()
        checks["whisperx_model"] = "ok"
    except Exception as e:
        checks["whisperx_model"] = str(e)

    all_ok = all(v == "ok" for v in checks.values())
    return {"status": "ready" if all_ok else "degraded", "checks": checks}
