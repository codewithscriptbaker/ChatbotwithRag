from functools import lru_cache
from pathlib import Path
from typing import Any

import whisperx

from app.core.config import get_settings


@lru_cache
def get_whisperx_model() -> Any:
    settings = get_settings()
    return whisperx.load_model(
        settings.whisperx_model,
        settings.whisperx_device,
        compute_type=settings.whisperx_compute_type,
    )


def transcribe_audio(audio_path: Path) -> str:
    settings = get_settings()
    model = get_whisperx_model()
    audio = whisperx.load_audio(str(audio_path))
    result = model.transcribe(audio, language=settings.whisperx_language)
    segments = result.get("segments", [])
    text = " ".join(segment.get("text", "").strip() for segment in segments if segment.get("text"))
    return text.strip()
