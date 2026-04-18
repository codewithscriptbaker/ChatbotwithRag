from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_chat_model: str = "llama3.1:8b"

    embedding_model: str = "all-MiniLM-L6-v2"
    whisperx_model: str = "small"
    whisperx_device: str = "cpu"
    whisperx_compute_type: str = "int8"
    whisperx_language: str | None = None

    upload_dir: str = "storage/uploads"
    max_file_mb: int = 20

    chroma_persist_dir: str = "storage/chromadb"

    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_mb * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_path(self) -> Path:
        path = Path(self.chroma_persist_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
