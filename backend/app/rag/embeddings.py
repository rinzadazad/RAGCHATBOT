import gc
import logging
import os
import shutil
from typing import List

from fastembed import TextEmbedding

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
FASTEMBED_CACHE = "/tmp/fastembed_cache"

_model: TextEmbedding | None = None


def _clear_cache() -> None:
    try:
        if os.path.exists(FASTEMBED_CACHE):
            shutil.rmtree(FASTEMBED_CACHE)
            logging.warning("Cleared fastembed cache (corrupted download detected)")
    except Exception as exc:
        logging.warning("Could not clear fastembed cache: %s", exc)


def get_embedding_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=EMBEDDING_MODEL, cache_dir=FASTEMBED_CACHE)
    return _model


def _is_missing_model_error(exc: Exception) -> bool:
    msg = str(exc)
    return any(k in msg for k in ("NO_SUCH_FILE", "File doesn't exist", "model_optimized.onnx"))


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    global _model
    try:
        return [emb.tolist() for emb in get_embedding_model().embed(texts)]
    except Exception as exc:
        if not _is_missing_model_error(exc):
            raise
        # Partial/corrupted download — wipe cache, reset singleton, retry once
        logging.warning("fastembed model file missing, re-downloading: %s", exc)
        _clear_cache()
        _model = None
        gc.collect()
        return [emb.tolist() for emb in get_embedding_model().embed(texts)]


def generate_single_embedding(text: str) -> List[float]:
    return generate_embeddings([text])[0]
