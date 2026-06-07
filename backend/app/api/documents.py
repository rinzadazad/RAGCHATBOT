import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.models import User, Document, DocumentStatus, UserRole
from app.schemas.schemas import DocumentOut, DocumentStats, ReindexRequest, UrlIngestRequest, TextIngestRequest
from app.services.document_service import (
    get_user_documents,
    get_document_by_id,
    get_document_stats,
    delete_document,
    reindex_document,
    _process_in_background,
)
from app.utils.file_utils import save_upload_file, get_upload_dir, clean_text
from app.rag.retriever import get_collection_count, get_all_collections_count

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=List[DocumentOut], status_code=201)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created_docs = []
    for file in files:
        unique_filename, file_type, file_size = await save_upload_file(file)

        document = Document(
            user_id=current_user.id,
            filename=unique_filename,
            original_filename=file.filename,
            file_type=file_type,
            file_size=file_size,
            status=DocumentStatus.PENDING,
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        created_docs.append(document)

        background_tasks.add_task(_process_in_background, document.id)

    return [DocumentOut.model_validate(d) for d in created_docs]


@router.get("", response_model=List[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        # Admin sees every document across all users, with owner email attached
        docs = db.query(Document).order_by(Document.upload_date.desc()).all()
        result = []
        for doc in docs:
            owner = db.query(User).filter(User.id == doc.user_id).first()
            out = DocumentOut.model_validate(doc)
            out.owner_email = owner.email if owner else None
            result.append(out)
        return result
    docs = get_user_documents(current_user.id, db)
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/stats", response_model=DocumentStats)
def document_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        all_docs = db.query(Document).all()
        return DocumentStats(
            total_documents=len(all_docs),
            total_chunks=sum(d.chunk_count for d in all_docs),
            indexed_documents=sum(1 for d in all_docs if d.status == DocumentStatus.INDEXED),
            failed_documents=sum(1 for d in all_docs if d.status == DocumentStatus.FAILED),
            storage_used_bytes=sum(d.file_size for d in all_docs),
            vector_count=get_all_collections_count(),
        )

    stats = get_document_stats(current_user.id, db)
    return DocumentStats(
        total_documents=stats.total_documents,
        total_chunks=stats.total_chunks,
        indexed_documents=stats.indexed_documents,
        failed_documents=stats.failed_documents,
        storage_used_bytes=stats.storage_used_bytes,
        vector_count=get_collection_count(current_user.id),
    )


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        doc = db.query(Document).filter(Document.id == document_id).first()
    else:
        doc = get_document_by_id(document_id, current_user.id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)


@router.delete("/{document_id}", status_code=204)
def delete_doc(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        from app.rag.retriever import delete_document_chunks
        from app.utils.file_utils import delete_file
        delete_document_chunks(doc.user_id, doc.id)
        delete_file(doc.filename)
        db.delete(doc)
        db.commit()
        return
    deleted = delete_document(document_id, current_user.id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")


@router.post("/reindex", response_model=List[DocumentOut])
def reindex_documents(
    request: ReindexRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    for doc_id in request.document_ids:
        doc = reindex_document(doc_id, current_user.id, db)
        if doc:
            results.append(DocumentOut.model_validate(doc))
    return results


@router.post("/ingest/url", response_model=DocumentOut, status_code=201)
def ingest_url(
    request: UrlIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crawl a website and index all its content into the knowledge base."""
    # Validate URL scheme
    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    # Save a placeholder .txt file; the background task will crawl and write to it
    unique_filename = f"{uuid.uuid4().hex}_url.txt"
    placeholder_path = get_upload_dir() / unique_filename
    placeholder_path.write_text(f"Pending crawl: {request.url}", encoding="utf-8")

    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=request.keyword,
        file_type="txt",
        file_size=0,
        status=DocumentStatus.PENDING,
        source_type="url",
        keyword=request.keyword,
        source_url=request.url,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    background_tasks.add_task(_crawl_and_process, document.id, request.url, request.max_pages)
    return DocumentOut.model_validate(document)


@router.post("/ingest/text", response_model=DocumentOut, status_code=201)
def ingest_text(
    request: TextIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Index raw text directly into the knowledge base."""
    cleaned = clean_text(request.content)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text content is empty after cleaning")

    unique_filename = f"{uuid.uuid4().hex}_text.txt"
    file_path = get_upload_dir() / unique_filename
    file_path.write_text(cleaned, encoding="utf-8")

    document = Document(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=request.keyword,
        file_type="txt",
        file_size=len(cleaned.encode("utf-8")),
        status=DocumentStatus.PENDING,
        source_type="text",
        keyword=request.keyword,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    background_tasks.add_task(_process_in_background, document.id)
    return DocumentOut.model_validate(document)


def _crawl_and_process(document_id: int, url: str, max_pages: int) -> None:
    from app.database.database import SessionLocal
    from app.rag.pipeline import process_document
    from app.services.url_crawler import crawl_website
    from app.utils.file_utils import get_upload_dir, clean_text

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        doc.status = DocumentStatus.PROCESSING
        db.commit()

        raw_text = crawl_website(url, max_pages=max_pages)
        cleaned = clean_text(raw_text)

        file_path = get_upload_dir() / doc.filename
        file_path.write_text(cleaned, encoding="utf-8")
        doc.file_size = len(cleaned.encode("utf-8"))
        db.commit()

        process_document(document_id, db)
    except Exception as e:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()
