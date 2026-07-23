"""
Email-only identity. No passwords, no sessions, no auth middleware.
The returned user_id is the client's key for every future request.
"""
from fastapi import APIRouter, HTTPException

from app.database import get_supabase
from app.models.schemas import IdentifyRequest, IdentifyResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/identify", response_model=IdentifyResponse)
def identify(payload: IdentifyRequest):
    supabase = get_supabase()
    email = payload.email.lower().strip()

    existing = supabase.table("users").select("*").eq("email", email).execute()

    if existing.data:
        user = existing.data[0]
        return IdentifyResponse(user_id=user["id"], email=user["email"], is_new_user=False)

    created = supabase.table("users").insert({"email": email}).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create user.")

    user = created.data[0]
    return IdentifyResponse(user_id=user["id"], email=user["email"], is_new_user=True)
