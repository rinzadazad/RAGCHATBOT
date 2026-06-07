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

        if not clean:
            raise ValueError("No extractable text found in document")

        chunks = chunk_text(clean, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        if not chunks:
            raise ValueError("Text chunking produced no chunks")

        embeddings = generate_embeddings(chunks)
        delete_document_chunks(user_id, document_id, db)
        add_chunks_to_vector_store(
            user_id=user_id,
            document_id=document_id,
            document_name=document.original_filename,
            chunks=chunks,
            embeddings=embeddings,
            db=db,
        )

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
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {chunk['document_name']} | Relevance: {chunk['similarity_score']}]\n{chunk['text']}"
        )

    context = "\n\n---\n\n".join(context_parts)

    return (
        "You are a knowledge base assistant. Your ONLY job is to answer questions using "
        "the context passages provided below. Follow these rules strictly:\n"
        "1. Answer ONLY from the provided context. Do NOT use any outside knowledge.\n"
        "2. If the context does not contain a clear answer, say exactly: "
        "'I don't know based on the provided documents.'\n"
        "3. Do not guess, infer beyond the text, or bring in general knowledge.\n"
        "4. Quote or reference the source when possible.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION: {query}\n\n"
        "ANSWER (from context only):"
    )
