import gc
import time
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.models import Document, DocumentStatus, Settings
from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embeddings, generate_single_embedding
from app.rag.retriever import (
    add_chunks_to_vector_store, retrieve_similar_chunks,
    retrieve_similar_chunks_all_users, delete_document_chunks,
)
from app.utils.file_utils import extract_text_from_file, clean_text

RAG_SIMILARITY_THRESHOLD = 0.5
EMBED_BATCH_SIZE = 16  # embed+insert 16 chunks at a time to stay under 512 MB

NO_CONTEXT_REPLY = (
    "I could not find sufficient information in your uploaded documents to answer this question. "
    "Would you like me to search external internet sources for additional information?"
)

LLM_NO_INFO_PHRASE = "I don't know based on the provided documents"


def passes_rag_guard(chunks: List[Dict[str, Any]]) -> bool:
    """Return True only if at least one chunk has similarity >= 50%."""
    return any(c["similarity_score"] >= RAG_SIMILARITY_THRESHOLD for c in chunks)


def llm_says_no_info(answer: str) -> bool:
    """Return True when the LLM explicitly said it couldn't find the answer in the documents."""
    return LLM_NO_INFO_PHRASE.lower() in answer.lower()


def process_document(document_id: int, db: Session) -> None:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return

    user_id = document.user_id
    document.status = DocumentStatus.PROCESSING
    db.commit()

    try:
        settings = db.query(Settings).filter(Settings.user_id == user_id).first()
        chunk_size = settings.chunk_size if settings else 512
        chunk_overlap = settings.chunk_overlap if settings else 50

        raw_text = extract_text_from_file(document.filename, document.file_type)
        clean = clean_text(raw_text)
        del raw_text
        gc.collect()

        if not clean:
            raise ValueError("No extractable text found in document")

        chunks = chunk_text(clean, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        del clean
        gc.collect()

        if not chunks:
            raise ValueError("Text chunking produced no chunks")

        delete_document_chunks(user_id, document_id, db)

        for batch_start in range(0, len(chunks), EMBED_BATCH_SIZE):
            batch = chunks[batch_start:batch_start + EMBED_BATCH_SIZE]
            embeddings = generate_embeddings(batch)
            add_chunks_to_vector_store(
                user_id=user_id,
                document_id=document_id,
                document_name=document.original_filename,
                chunks=batch,
                embeddings=embeddings,
                start_index=batch_start,
                db=db,
            )
            del embeddings, batch
            gc.collect()

        document.chunk_count = len(chunks)
        document.status = DocumentStatus.INDEXED
        document.error_message = None

    except Exception as e:
        document.status = DocumentStatus.FAILED
        document.error_message = str(e)

    db.commit()


def retrieve_context(
    query: str,
    user_id: int,
    db,
    is_admin: bool = False,
    top_k: int = 5,
    similarity_threshold: float = RAG_SIMILARITY_THRESHOLD,
    source_ids: Optional[List[int]] = None,
) -> Tuple[List[Dict[str, Any]], float]:
    start = time.perf_counter()
    query_embedding = generate_single_embedding(query)
    if is_admin:
        chunks = retrieve_similar_chunks_all_users(
            query_embedding=query_embedding,
            db=db,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            document_ids=source_ids,
        )
    else:
        chunks = retrieve_similar_chunks(
            user_id=user_id,
            query_embedding=query_embedding,
            db=db,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            document_ids=source_ids,
        )
    elapsed_ms = (time.perf_counter() - start) * 1000
    return chunks, round(elapsed_ms, 2)


def build_rag_prompt(query: str, chunks: List[Dict[str, Any]]) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%A, %d %B %Y")        # e.g. "Monday, 22 June 2026"
    time_str  = now.strftime("%H:%M UTC")            # e.g. "09:14 UTC"

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {chunk['document_name']} | Relevance: {chunk['similarity_score']}]\n{chunk['text']}"
        )

    context = "\n\n---\n\n".join(context_parts)

    return (
        "You are a knowledge base assistant. Answer questions using the context passages below.\n"
        f"TODAY'S DATE AND TIME: {today_str}, {time_str}\n\n"
        "Rules:\n"
        "1. Answer primarily from the provided context documents.\n"
        "2. You KNOW today's date (shown above). Use it freely to reason about deadlines, "
        "validity, expiry, past/future events, or any time-sensitive question — even if the "
        "documents do not mention 'today'. For example: if a booking check-out date has already "
        "passed relative to today, say it is no longer valid.\n"
        "3. If the context contains no relevant information at all, say: "
        "'I don't know based on the provided documents.'\n"
        "4. Quote or reference the source document when possible.\n"
        "5. Do NOT invent facts not present in the context, but DO use logical reasoning "
        "that combines context facts with today's date.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION: {query}\n\n"
        "ANSWER:"
    )
