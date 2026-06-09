import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

from app.database.database import engine, ensure_extensions, run_migrations
from app.models.models import Base
from app.api import auth, documents, chat, search, settings as settings_router, admin

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting up — DATABASE_URL prefix: %s", os.getenv("DATABASE_URL", "NOT SET")[:20])
    try:
        ensure_extensions()
        logging.info("pgvector extension check done")
        Base.metadata.create_all(bind=engine)
        logging.info("Database tables created")
        run_migrations()
        logging.info("Migrations complete")
    except Exception as exc:
        logging.exception("Startup failed: %s", exc)
        raise

    # Re-queue any documents stuck in pending/processing from a previous run
    try:
        import threading
        from app.database.database import SessionLocal
        from app.models.models import Document, DocumentStatus
        from app.services.document_service import _process_in_background

        with SessionLocal() as db:
            stuck = db.query(Document).filter(
                Document.status.in_([DocumentStatus.PENDING, DocumentStatus.PROCESSING])
            ).all()
            stuck_ids = [d.id for d in stuck]
            for doc in stuck:
                doc.status = DocumentStatus.PENDING
            db.commit()

        for doc_id in stuck_ids:
            threading.Thread(target=_process_in_background, args=(doc_id,), daemon=True).start()

        if stuck_ids:
            logging.info("Startup: re-queued %d stuck document(s): %s", len(stuck_ids), stuck_ids)
    except Exception as exc:
        logging.warning("Startup: could not re-queue stuck documents: %s", exc)

    yield


app = FastAPI(
    title="RAG Chatbot API",
    description="Production-ready Retrieval-Augmented Generation Chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Length"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(settings_router.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "RAG Chatbot API", "docs": "/docs"}
