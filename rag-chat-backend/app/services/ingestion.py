"""
Document ingestion pipeline: download -> parse -> chunk -> embed -> store.
Runs as a FastAPI BackgroundTask so the upload endpoint returns instantly.

Scaling note: this function's body is intentionally self-contained.
When ingestion volume grows, this exact logic moves into a Celery task
with zero changes to the pipeline itself — only the trigger mechanism
(BackgroundTasks -> Celery .delay()) changes.
"""
import logging

from app.config import get_settings
from app.database import get_supabase
from app.services import storage, vector_store
from app.services.pdf_parser import extract_pages, get_page_count
from app.utils.chunking import chunk_pages

logger = logging.getLogger(__name__)


def process_document(document_id: str, storage_path: str) -> None:
    supabase = get_supabase()
    settings = get_settings()

    try:
        file_bytes = storage.download_file(storage_path)

        page_count = get_page_count(file_bytes)
        pages = extract_pages(file_bytes)

        if not pages:
            raise ValueError("No extractable text found in PDF (it may be a scanned/image-only PDF).")

        chunks = chunk_pages(
            pages,
            chunk_size=settings.chunk_size_tokens,
            overlap=settings.chunk_overlap_tokens,
        )

        vector_store.insert_chunks(document_id, chunks)

        supabase.table("documents").update({
            "status": "ready",
            "page_count": page_count,
        }).eq("id", document_id).execute()

        logger.info(f"Document {document_id} processed: {len(chunks)} chunks from {page_count} pages.")

    except Exception as e:
        logger.exception(f"Failed to process document {document_id}")
        supabase.table("documents").update({
            "status": "failed",
            "error_message": str(e)[:500],
        }).eq("id", document_id).execute()
