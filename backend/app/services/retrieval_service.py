from app.services.embedding_service import embed_query
from app.vectorstore.search import (
    SearchResult,
    similarity_search,
    similarity_search_by_folder,
)


def retrieve(
    document_id: str,
    question: str,
    top_k: int = 5,
) -> list[SearchResult]:
    query_embedding = embed_query(question)
    results = similarity_search(
        query_embedding=query_embedding,
        document_id=document_id,
        top_k=top_k,
    )
    return results


def retrieve_by_folder(
    folder_id: str,
    question: str,
    top_k: int = 5,
) -> list[SearchResult]:
    query_embedding = embed_query(question)
    results = similarity_search_by_folder(
        query_embedding=query_embedding,
        folder_id=folder_id,
        top_k=top_k,
    )
    return results
