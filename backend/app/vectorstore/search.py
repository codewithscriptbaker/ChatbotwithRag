from dataclasses import dataclass

from app.vectorstore.client import get_collection


@dataclass
class SearchResult:
    chunk_index: int
    text: str
    score: float
    metadata: dict


def similarity_search(
    query_embedding: list[float],
    document_id: str,
    top_k: int = 5,
) -> list[SearchResult]:
    collection = get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"document_id": document_id},
        include=["documents", "metadatas", "distances"],
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    search_results = []
    for i, chunk_id in enumerate(results["ids"][0]):
        distance = results["distances"][0][i] if results["distances"] else 0.0
        # ChromaDB cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity score: 1 - (distance / 2)
        score = 1.0 - (distance / 2.0)

        text = results["documents"][0][i] if results["documents"] else ""
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}

        chunk_index = metadata.get("chunk_index", 0)

        search_results.append(
            SearchResult(
                chunk_index=chunk_index,
                text=text,
                score=round(score, 4),
                metadata=metadata,
            )
        )

    return search_results


def similarity_search_by_folder(
    query_embedding: list[float],
    folder_id: str,
    top_k: int = 5,
) -> list[SearchResult]:
    collection = get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"folder_id": folder_id},
        include=["documents", "metadatas", "distances"],
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    search_results = []
    for i, _chunk_id in enumerate(results["ids"][0]):
        distance = results["distances"][0][i] if results["distances"] else 0.0
        score = 1.0 - (distance / 2.0)

        text = results["documents"][0][i] if results["documents"] else ""
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}
        chunk_index = metadata.get("chunk_index", 0)

        search_results.append(
            SearchResult(
                chunk_index=chunk_index,
                text=text,
                score=round(score, 4),
                metadata=metadata,
            )
        )

    return search_results
