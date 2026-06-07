import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import os
from pathlib import Path

_client: chromadb.PersistentClient | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        chroma_path = os.getenv("CHROMA_DB_PATH", "./chroma_db")
        Path(chroma_path).mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_user_collection(user_id: int) -> chromadb.Collection:
    """Each user gets their own isolated ChromaDB collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=f"rag_user_{user_id}",
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks_to_vector_store(
    user_id: int,
    document_id: int,
    document_name: str,
    chunks: List[str],
    embeddings: List[List[float]],
) -> List[str]:
    collection = get_user_collection(user_id)
    ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "document_id": str(document_id),
            "document_name": document_name,
            "chunk_index": str(i),
        }
        for i in range(len(chunks))
    ]
    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    return ids


def retrieve_similar_chunks(
    user_id: int,
    query_embedding: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.5,
    document_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    collection = get_user_collection(user_id)

    if collection.count() == 0:
        return []

    allowed = {str(d) for d in document_ids} if document_ids else None
    # Fetch extra candidates so post-filtering still returns top_k good results
    fetch_n = min((top_k * 4) if allowed else top_k, collection.count())

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=fetch_n,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for i, (doc, meta, distance) in enumerate(
        zip(results["documents"][0], results["metadatas"][0], results["distances"][0])
    ):
        if allowed and meta.get("document_id") not in allowed:
            continue
        similarity = 1.0 - distance
        if similarity >= similarity_threshold:
            chunks.append(
                {
                    "chunk_id": results["ids"][0][i],
                    "text": doc,
                    "similarity_score": round(similarity, 4),
                    "document_name": meta.get("document_name", "Unknown"),
                    "document_id": meta.get("document_id"),
                    "chunk_index": meta.get("chunk_index"),
                }
            )

    return sorted(chunks, key=lambda x: x["similarity_score"], reverse=True)[:top_k]


def delete_document_chunks(user_id: int, document_id: int) -> int:
    """
    Delete all ChromaDB vectors for a document.
    Uses two strategies to be robust across ChromaDB versions:
      1. Metadata where-clause query (preferred).
      2. Deterministic ID pattern fallback (doc_{id}_chunk_{n}).
    """
    try:
        collection = get_user_collection(user_id)
        if collection.count() == 0:
            return 0

        # Strategy 1: query by metadata
        deleted = 0
        try:
            result = collection.get(
                where={"document_id": str(document_id)},
                include=[],          # only fetch IDs, nothing else
            )
            ids = result.get("ids", [])
            if ids:
                collection.delete(ids=ids)
                deleted = len(ids)
        except Exception:
            pass

        # Strategy 2: deterministic ID pattern fallback
        # Chunk IDs are always "doc_{document_id}_chunk_{i}" (see add_chunks_to_vector_store)
        if deleted == 0:
            candidate_ids = [f"doc_{document_id}_chunk_{i}" for i in range(2000)]
            result = collection.get(ids=candidate_ids, include=[])
            ids = result.get("ids", [])
            if ids:
                collection.delete(ids=ids)
                deleted = len(ids)

        return deleted
    except Exception:
        return 0


def retrieve_similar_chunks_all_users(
    query_embedding: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.5,
    document_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """Admin-only: search across every user's ChromaDB collection."""
    client = get_chroma_client()
    all_chunks: List[Dict[str, Any]] = []
    allowed = {str(d) for d in document_ids} if document_ids else None

    try:
        collections = client.list_collections()
    except Exception:
        return []

    for col_obj in collections:
        name = col_obj.name if hasattr(col_obj, "name") else str(col_obj)
        if not name.startswith("rag_user_"):
            continue
        try:
            collection = client.get_collection(name)
            if collection.count() == 0:
                continue
            fetch_n = min((top_k * 4) if allowed else top_k, collection.count())
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=fetch_n,
                include=["documents", "metadatas", "distances"],
            )
            for i, (doc, meta, distance) in enumerate(
                zip(results["documents"][0], results["metadatas"][0], results["distances"][0])
            ):
                if allowed and meta.get("document_id") not in allowed:
                    continue
                similarity = 1.0 - distance
                if similarity >= similarity_threshold:
                    all_chunks.append({
                        "chunk_id": results["ids"][0][i],
                        "text": doc,
                        "similarity_score": round(similarity, 4),
                        "document_name": meta.get("document_name", "Unknown"),
                        "document_id": meta.get("document_id"),
                        "chunk_index": meta.get("chunk_index"),
                        "collection": name,
                    })
        except Exception:
            continue

    return sorted(all_chunks, key=lambda x: x["similarity_score"], reverse=True)[:top_k]


def get_collection_count(user_id: int) -> int:
    try:
        collection = get_user_collection(user_id)
        return collection.count()
    except Exception:
        return 0


def get_all_collections_count() -> int:
    try:
        client = get_chroma_client()
        total = 0
        for col_obj in client.list_collections():
            name = col_obj.name if hasattr(col_obj, "name") else str(col_obj)
            if name.startswith("rag_user_"):
                total += client.get_collection(name).count()
        return total
    except Exception:
        return 0
