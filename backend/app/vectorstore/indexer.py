from app.vectorstore.client import get_collection


def upsert_chunks(
    document_id: str,
    chunk_texts: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    collection = get_collection()

    ids = [f"{document_id}_chunk_{i}" for i in range(len(chunk_texts))]

    for meta in metadatas:
        meta["document_id"] = document_id

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunk_texts,
        metadatas=metadatas,
    )


def delete_document_chunks(document_id: str) -> None:
    collection = get_collection()
    existing = collection.get(where={"document_id": document_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
