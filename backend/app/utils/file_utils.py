import os
import uuid
import tempfile
from pathlib import Path
from fastapi import UploadFile, HTTPException
import PyPDF2
import docx

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".doc"}
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024
BUCKET_NAME = os.getenv("SUPABASE_BUCKET", "documents")

_supabase_client = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY"),
        )
    return _supabase_client


def validate_file(file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    return ext.lstrip(".")


def generate_unique_filename(original_filename: str) -> str:
    ext = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    ext = validate_file(file)
    unique_filename = generate_unique_filename(file.filename)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )

    get_supabase_client().storage.from_(BUCKET_NAME).upload(
        unique_filename, content, {"content-type": "application/octet-stream"}
    )
    return unique_filename, ext, len(content)


def save_text_as_file(filename: str, content: str) -> int:
    """Upload (or replace) a text string as a file in Supabase Storage. Returns byte size."""
    data = content.encode("utf-8")
    client = get_supabase_client()
    try:
        client.storage.from_(BUCKET_NAME).remove([filename])
    except Exception:
        pass
    client.storage.from_(BUCKET_NAME).upload(
        filename, data, {"content-type": "text/plain; charset=utf-8"}
    )
    return len(data)


def extract_text_from_file(filename: str, file_type: str) -> str:
    """Download file from Supabase Storage and extract its text content."""
    content = get_supabase_client().storage.from_(BUCKET_NAME).download(filename)

    with tempfile.NamedTemporaryFile(suffix=f".{file_type}", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        path = Path(tmp_path)
        if file_type == "pdf":
            return _extract_pdf(path)
        elif file_type == "txt":
            return _extract_txt(path)
        elif file_type in ("docx", "doc"):
            return _extract_docx(path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    finally:
        os.unlink(tmp_path)


def delete_file(filename: str) -> bool:
    try:
        get_supabase_client().storage.from_(BUCKET_NAME).remove([filename])
        return True
    except Exception:
        return False


def get_storage_used() -> int:
    return 0  # Tracked via Document.file_size in the database


def _extract_pdf(path: Path) -> str:
    text_parts = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text.strip())
    return "\n\n".join(text_parts)


def _extract_txt(path: Path) -> str:
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to decode text file")


def _extract_docx(path: Path) -> str:
    doc = docx.Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def clean_text(text: str) -> str:
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'[^\x20-\x7E\n\t]', ' ', text)
    return text.strip()
