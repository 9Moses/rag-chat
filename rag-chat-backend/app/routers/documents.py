"""
Document upload + management.
Upload returns immediately (status=processing); actual parsing/chunking/
embedding happens in a BackgroundTask so the request never blocks on a
slow PDF.
"""
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.config import get_settings
from app.database import get_supabase
from app.dependencies import get_current_user_id
from app.models.schemas import DocumentResponse, DocumentStatusResponse
from app.services import storage
from app.services.ingestion import process_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    settings = get_settings()

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently.")

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f}MB). Max is {settings.max_upload_mb}MB.",
        )

    storage_path = storage.upload_file(file_bytes, file.filename, user_id)

    supabase = get_supabase()
    inserted = supabase.table("documents").insert({
        "user_id": user_id,
        "filename": file.filename,
        "storage_path": storage_path,
        "status": "processing",
    }).execute()

    document = inserted.data[0]

    background_tasks.add_task(process_document, document["id"], storage_path)

    return DocumentResponse(**document)


@router.get("", response_model=list[DocumentResponse])
def list_documents(user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [DocumentResponse(**d) for d in result.data]


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_status(document_id: UUID, user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("*")
        .eq("id", str(document_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentStatusResponse(**result.data[0])


@router.delete("/{document_id}")
def delete_document(document_id: UUID, user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("*")
        .eq("id", str(document_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc = result.data[0]
    storage.delete_file(doc["storage_path"])
    # chunks cascade-delete via FK constraint
    supabase.table("documents").delete().eq("id", str(document_id)).execute()
    return {"deleted": True}
