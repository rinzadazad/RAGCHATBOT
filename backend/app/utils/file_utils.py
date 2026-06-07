import os
import uuid
import hashlib
from pathlib import Path
from fastapi import UploadFile, HTTPException
import PyPDF2
import docx
import aiofiles

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
}
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".doc"}
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024


def get_upload_dir() -> Path:
    upload_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


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
    unique_id = uuid.uuid4().hex
    return f"{unique_id}{ext}"


async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    ext = validate_file(file)
    unique_filename = generate_unique_filename(file.filename)
    save_path = get_upload_dir() / unique_filename

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE_BYTES // (1024*1024)}MB")

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(content)

    return unique_filename, ext, len(content)


def extract_text_from_file(file_path: str, file_type: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_type == "pdf":
        return _extract_pdf(path)
    elif file_type == "txt":
        return _extract_txt(path)
    elif file_type in ("docx", "doc"):
        return _extract_docx(path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


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
    encodings = ["utf-8", "latin-1", "cp1252"]
    for enc in encodings:
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


def delete_file(filename: str) -> bool:
    path = get_upload_dir() / filename
    if path.exists():
        path.unlink()
        return True
    return False


def get_storage_used() -> int:
    upload_dir = get_upload_dir()
    total = 0
    for f in upload_dir.iterdir():
        if f.is_file():
            total += f.stat().st_size
    return total
