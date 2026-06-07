import json
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

from app.models.models import Document, DocumentStatus
from app.schemas.schemas import DocumentStats
from app.rag.pipeline import process_document
from app.rag.retriever import delete_document_chunks
from app.utils.file_utils import delete_file


def get_document_by_id(document_id: int, user_id: int, db: Session) -> Optional[Document]:
    return db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()


def get_user_documents(user_id: int, db: Session) -> List[Document]:
    return db.query(Document).filter(Document.user_id == user_id).order_by(Document.upload_date.desc()).all()


def get_document_stats(user_id: int, db: Session) -> DocumentStats:
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    total_docs = len(docs)
    indexed_docs = sum(1 for d in docs if d.status == DocumentStatus.INDEXED)
    failed_docs = sum(1 for d in docs if d.status == DocumentStatus.FAILED)
    total_chunks = sum(d.chunk_count for d in docs)
    storage_used = sum(d.file_size for d in docs)

    return DocumentStats(
        total_documents=total_docs,
        total_chunks=total_chunks,
        indexed_documents=indexed_docs,
        failed_documents=failed_docs,
        storage_used_bytes=storage_used,
    )


def delete_document(document_id: int, user_id: int, db: Session) -> bool:
    document = get_document_by_id(document_id, user_id, db)
    if not document:
        return False

    delete_document_chunks(document.user_id, document_id, db)
    delete_file(document.filename)
    db.delete(document)
    db.commit()
    return True


def queue_document_processing(document: Document, db: Session, background_tasks: BackgroundTasks) -> None:
    background_tasks.add_task(_process_in_background, document.id)


def _process_in_background(document_id: int) -> None:
    from app.database.database import SessionLocal
    db = SessionLocal()
    try:
        process_document(document_id, db)
    finally:
        db.close()


def reindex_document(document_id: int, user_id: int, db: Session) -> Optional[Document]:
    document = get_document_by_id(document_id, user_id, db)
    if not document:
        return None

    document.status = DocumentStatus.PENDING
    document.error_message = None
    document.chunk_count = 0
    db.commit()

    _process_in_background(document_id)

    db.refresh(document)
    return document
