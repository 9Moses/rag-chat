"""
File storage via Supabase Storage (free alternative to S3).
Wrapped behind functions so the storage backend can be swapped later
(e.g. Cloudflare R2) without touching the rest of the app.
"""
import uuid

from app.config import get_settings
from app.database import get_supabase


def upload_file(file_bytes: bytes, filename: str, user_id: str) -> str:
    """Uploads a file and returns its storage path."""
    settings = get_settings()
    supabase = get_supabase()

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "pdf"
    storage_path = f"{user_id}/{uuid.uuid4()}.{ext}"

    supabase.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        file_bytes,
        file_options={"content-type": "application/pdf"},
    )
    return storage_path


def download_file(storage_path: str) -> bytes:
    settings = get_settings()
    supabase = get_supabase()
    return supabase.storage.from_(settings.supabase_storage_bucket).download(storage_path)


def delete_file(storage_path: str) -> None:
    settings = get_settings()
    supabase = get_supabase()
    supabase.storage.from_(settings.supabase_storage_bucket).remove([storage_path])
