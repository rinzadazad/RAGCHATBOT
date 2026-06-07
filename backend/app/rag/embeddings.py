from fastembed import TextEmbedding
from typing import List
import os

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

_model: TextEmbedding | None = None


def get_embedding_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=EMBEDDING_MODEL)
    return _model


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    model = get_embedding_model()
    return [emb.tolist() for emb in model.embed(texts)]


def generate_single_embedding(text: str) -> List[float]:
    return generate_embeddings([text])[0]
