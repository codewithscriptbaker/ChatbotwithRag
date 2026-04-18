from functools import lru_cache

import chromadb

from app.core.config import get_settings

COLLECTION_NAME = "document_chunks"


@lru_cache
def get_chroma_client() -> chromadb.ClientAPI:
    settings = get_settings()
    client = chromadb.PersistentClient(path=str(settings.chroma_path))
    return client


def get_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
