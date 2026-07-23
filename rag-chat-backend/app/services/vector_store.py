"""
Vector store operations, backed by Postgres/pgvector via Supabase.

This module is intentionally the ONLY place that knows chunks live in
pgvector. If you later migrate to Qdrant/Pinecone, this is the only file
that needs to change — routers and other services just call these functions.
"""
from uuid import UUID

from app.config import get_settings
from app.database import get_supabase
from app.services.embeddings import embed_texts, embed_query


def insert_chunks(document_id: str, chunks: list[dict]) -> None:
    """
    chunks: [{"content", "page_number", "chunk_index", "token_count"}, ...]
    Embeds all chunk contents in one batch call, then bulk-inserts.
    """
    if not chunks:
        return

    supabase = get_supabase()
    contents = [c["content"] for c in chunks]
    vectors = embed_texts(contents)

    rows = [
        {
            "document_id": document_id,
            "content": c["content"],
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
            "token_count": c["token_count"],
            "embedding": vectors[i],
        }
        for i, c in enumerate(chunks)
    ]

    # Batch insert to avoid one round-trip per chunk
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        supabase.table("chunks").insert(rows[i:i + batch_size]).execute()


def similarity_search(
    query: str,
    document_ids: list[UUID],
    top_k: int | None = None,
) -> list[dict]:
    """
    Embeds the query and calls the `match_chunks` Postgres RPC function
    (defined in sql/schema.sql) which does the cosine-similarity ANN search.
    """
    if not document_ids:
        return []

    settings = get_settings()
    supabase = get_supabase()
    query_vector = embed_query(query)

    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_vector,
            "match_count": top_k or settings.top_k_chunks,
            "filter_document_ids": [str(d) for d in document_ids],
        },
    ).execute()

    return result.data or []
