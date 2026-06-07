from sentence_transformers import SentenceTransformer
from typing import List
import os

_model: SentenceTransformer | None = None
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def generate_single_embedding(text: str) -> List[float]:
    return generate_embeddings([text])[0]
