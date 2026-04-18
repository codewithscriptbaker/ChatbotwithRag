from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import get_settings

_model: SentenceTransformer | None = None


@lru_cache
def get_embedding_model() -> SentenceTransformer:
    settings = get_settings()
    print(f"[embedding] Loading model: {settings.embedding_model}")
    model = SentenceTransformer(settings.embedding_model)
    print(f"[embedding] Model loaded. Dimension: {model.get_sentence_embedding_dimension()}")
    return model


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]
