import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

from app.database.database import engine, run_migrations
from app.models.models import Base
from app.api import auth, documents, chat, search, settings as settings_router, admin

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
    os.makedirs(os.getenv("CHROMA_DB_PATH", "./chroma_db"), exist_ok=True)
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
