from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from app.models.models import DocumentStatus, MessageRole


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str = "user"
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Documents ───────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    chunk_count: int
    status: DocumentStatus
    error_message: Optional[str] = None
    upload_date: datetime
    updated_at: Optional[datetime] = None
    owner_email: Optional[str] = None
    source_type: str = "file"
    keyword: Optional[str] = None
    source_url: Optional[str] = None

    class Config:
        from_attributes = True


class UrlIngestRequest(BaseModel):
    url: str = Field(..., min_length=7, max_length=2048)
    keyword: str = Field(..., min_length=1, max_length=255)
    max_pages: int = Field(default=50, ge=1, le=200)


class TextIngestRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10, max_length=500_000)


class DocumentStats(BaseModel):
    total_documents: int
    total_chunks: int
    indexed_documents: int
    failed_documents: int
    storage_used_bytes: int
    vector_count: int = 0


class ReindexRequest(BaseModel):
    document_ids: List[int]


# ─── Conversations & Messages ─────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: int
    role: MessageRole
    content: str
    rag_context: Optional[str] = None
    retrieved_chunks: Optional[str] = None
    prompt_tokens: int
    completion_tokens: int
    response_time_ms: float
    from_web: bool = False
    timestamp: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut]

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[int] = None
    model_override: Optional[str] = None
    allow_web_search: bool = False
    skip_user_message: bool = False  # True when this is a web-search follow-up (user msg already saved)
    force_web_search: bool = False   # True when user approved after "I don't know" — bypass RAG entirely
    source_ids: Optional[List[int]] = None  # Restrict retrieval to these document IDs (None = all)


class ChatResponse(BaseModel):
    conversation_id: int
    message_id: int
    answer: str
    retrieved_chunks: List[dict]
    prompt_tokens: int
    completion_tokens: int
    response_time_ms: float
    web_search_available: bool = False
    from_web: bool = False


class ConversationRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)


# ─── Search ───────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    conversation_id: int
    conversation_title: str
    message_id: int
    role: str
    content_snippet: str
    timestamp: datetime


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    page_size: int


# ─── Settings ─────────────────────────────────────────────────────────────────

class SettingsOut(BaseModel):
    id: int
    model_name: str
    temperature: float
    max_tokens: int
    top_p: float
    chunk_size: int
    chunk_overlap: int
    top_k: int
    similarity_threshold: float
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    model_name: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32768)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    chunk_size: Optional[int] = Field(None, ge=100, le=2000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=500)
    top_k: Optional[int] = Field(None, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


# ─── RAG Debug ────────────────────────────────────────────────────────────────

class RetrievedChunk(BaseModel):
    chunk_id: str
    text: str
    similarity_score: float
    document_name: str
    document_id: Optional[int] = None


class RAGDebugInfo(BaseModel):
    retrieved_chunks: List[RetrievedChunk]
    retrieval_time_ms: float
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    response_time_ms: float
