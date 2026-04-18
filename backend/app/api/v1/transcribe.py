import asyncio
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.services.transcribe_service import transcribe_audio
from app.utils.ids import generate_id

router = APIRouter(tags=["transcribe"])

ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".ogg"}


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {ext}. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
        )

    settings = get_settings()
    temp_path = settings.upload_path / f"speech_{generate_id()}{ext}"

    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        temp_path.write_bytes(audio_bytes)
        text = await asyncio.to_thread(transcribe_audio, temp_path)
        return {"text": text}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {error}") from error
    finally:
        if temp_path.exists():
            temp_path.unlink()
