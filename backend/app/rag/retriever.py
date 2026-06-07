from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam, ARRAY, Integer


def _vec(embedding: List[float]) -> str:
    return "[" + ",".join(map(str, embedding)) + "]"


def add_chunks_to_vector_store(
    user_id: int,
    document_id: int,
    document_name: str,
    chunks: List[str],
    embeddings: List[List[float]],
    db: Session,
) -> None:
    from app.models.models import DocumentChunk
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        db.add(DocumentChunk(
            document_id=document_id,
            user_id=user_id,
            chunk_index=i,
            text=chunk,
            document_name=document_name,
            embedding=embedding,
        ))
    db.commit()


def retrieve_similar_chunks(
    user_id: int,
    query_embedding: List[float],
    db: Session,
    top_k: int = 5,
    similarity_threshold: float = 0.5,
    document_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    embedding_str = _vec(query_embedding)

    if document_ids:
        stmt = text("""
            SELECT id, text, document_id, document_name, chunk_index,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_chunks
            WHERE user_id = :user_id
              AND document_id = ANY(:doc_ids)
              AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """).bindparams(bindparam("doc_ids", type_=ARRAY(Integer)))
        params = {"embedding": embedding_str, "user_id": user_id,
                  "doc_ids": document_ids, "threshold": similarity_threshold, "top_k": top_k}
    else:
        stmt = text("""
            SELECT id, text, document_id, document_name, chunk_index,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_chunks
            WHERE user_id = :user_id
              AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """)
        params = {"embedding": embedding_str, "user_id": user_id,
                  "threshold": similarity_threshold, "top_k": top_k}

    rows = db.execute(stmt, params).fetchall()
    return [
        {
            "chunk_id": str(row.id),
            "text": row.text,
            "similarity_score": round(float(row.similarity), 4),
            "document_name": row.document_name,
            "document_id": str(row.document_id),
            "chunk_index": str(row.chunk_index),
        }
        for row in rows
    ]


def retrieve_similar_chunks_all_users(
    query_embedding: List[float],
    db: Session,
    top_k: int = 5,
    similarity_threshold: float = 0.5,
    document_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    embedding_str = _vec(query_embedding)

    if document_ids:
        stmt = text("""
            SELECT id, text, document_id, document_name, chunk_index,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_chunks
            WHERE document_id = ANY(:doc_ids)
              AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """).bindparams(bindparam("doc_ids", type_=ARRAY(Integer)))
        params = {"embedding": embedding_str, "doc_ids": document_ids,
                  "threshold": similarity_threshold, "top_k": top_k}
    else:
        stmt = text("""
            SELECT id, text, document_id, document_name, chunk_index,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_chunks
            WHERE 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """)
        params = {"embedding": embedding_str, "threshold": similarity_threshold, "top_k": top_k}

    rows = db.execute(stmt, params).fetchall()
    return [
        {
            "chunk_id": str(row.id),
            "text": row.text,
            "similarity_score": round(float(row.similarity), 4),
            "document_name": row.document_name,
            "document_id": str(row.document_id),
            "chunk_index": str(row.chunk_index),
        }
        for row in rows
    ]


def delete_document_chunks(user_id: int, document_id: int, db: Session) -> int:
    result = db.execute(
        text("DELETE FROM document_chunks WHERE document_id = :doc_id AND user_id = :user_id"),
        {"doc_id": document_id, "user_id": user_id},
    )
    db.commit()
    return result.rowcount


def get_collection_count(user_id: int, db: Session) -> int:
    result = db.execute(
        text("SELECT COUNT(*) FROM document_chunks WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    return result.scalar() or 0


def get_all_collections_count(db: Session) -> int:
    result = db.execute(text("SELECT COUNT(*) FROM document_chunks"))
    return result.scalar() or 0
