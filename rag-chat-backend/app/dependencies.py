"""
Shared request dependencies.
Since there's no auth middleware, every protected route pulls the caller's
identity from the X-User-Id header (set by the frontend after /users/identify).
"""
from fastapi import Header, HTTPException

from app.database import get_supabase


def get_current_user_id(x_user_id: str = Header(..., alias="X-User-Id")) -> str:
    """
    Validates that X-User-Id corresponds to a real user row.
    Lightweight on purpose — this is identity, not authentication.
    """
    supabase = get_supabase()
    result = supabase.table("users").select("id").eq("id", x_user_id).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Unknown user_id. Call /users/identify first.")
    return x_user_id
