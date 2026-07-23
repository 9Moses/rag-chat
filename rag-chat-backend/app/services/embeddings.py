"""
Local embedding generation using sentence-transformers.
Loaded once at process startup and kept warm in memory — reloading the
model per-request would be extremely slow.
"""
from functools import lru_cache
from sentence_transformers import SentenceTransformer

from app.config import get_settings


@lru_cache
def get_embedding_model() -> SentenceTransformer:
    settings = get_settings()
    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-embeds a list of strings. Used for chunk ingestion."""
    if not texts:
        return []
    model = get_embedding_model()
    vectors = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
    return vectors.tolist()


def embed_query(text: str) -> list[float]:
    """Embeds a single query string. Used at chat/retrieval time."""
    model = get_embedding_model()
    vector = model.encode([text], normalize_embeddings=True)[0]
    return vector.tolist()
