"""
Token-aware text chunking with overlap.
Chunk quality is the single biggest lever on RAG answer quality — keep
page metadata attached to every chunk so citations stay accurate.
"""
from functools import lru_cache
import tiktoken


@lru_cache
def _get_encoder():
    """
    Lazy-loaded so importing this module never triggers a network call.
    The Docker image pre-fetches this at build time (see Dockerfile) so
    it's already cached before the container ever runs.
    """
    return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_get_encoder().encode(text))


def chunk_text(
    text: str,
    chunk_size: int = 700,
    overlap: int = 100,
) -> list[str]:
    """
    Splits text into overlapping chunks measured in tokens.
    Overlap preserves context across chunk boundaries so a fact split
    across two chunks isn't lost to retrieval.
    """
    if not text or not text.strip():
        return []

    encoder = _get_encoder()
    tokens = encoder.encode(text)
    if len(tokens) <= chunk_size:
        return [text.strip()]

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_str = encoder.decode(chunk_tokens).strip()
        if chunk_str:
            chunks.append(chunk_str)
        if end == len(tokens):
            break
        start = end - overlap  # step back for overlap

    return chunks


def chunk_pages(pages: list[dict], chunk_size: int, overlap: int) -> list[dict]:
    """
    Input: [{"page_number": 1, "text": "..."}, ...]
    Output: [{"page_number": 1, "chunk_index": 0, "content": "...", "token_count": N}, ...]

    Chunks per-page (rather than concatenating the whole doc first) so every
    chunk maps cleanly back to a single page for citations.
    """
    result = []
    for page in pages:
        page_chunks = chunk_text(page["text"], chunk_size, overlap)
        for idx, content in enumerate(page_chunks):
            result.append({
                "page_number": page["page_number"],
                "chunk_index": idx,
                "content": content,
                "token_count": count_tokens(content),
            })
    return result
