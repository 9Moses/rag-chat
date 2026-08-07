"""
Shared request dependencies.
Since there's no auth middleware, every protected route pulls the caller's
identity from the X-User-Id header (set by the frontend after /users/identify).
"""
import httpcore
import httpx
from fastapi import Header, HTTPException

from app.database import execute_supabase_query, get_supabase


def get_current_user_id(x_user_id: str = Header(..., alias="X-User-Id")) -> str:
    """
    Validates that X-User-Id corresponds to a real user row.
    Lightweight on purpose — this is identity, not authentication.
    """
    supabase = get_supabase()
    try:
        result = execute_supabase_query(
            supabase.table("users").select("id").eq("id", x_user_id).execute
        )
    except (httpx.RemoteProtocolError, httpx.TransportError, httpcore.ProtocolError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Temporary Supabase connectivity issue. Please retry.",
        ) from exc

    if not result.data:
        raise HTTPException(status_code=401, detail="Unknown user_id. Call /users/identify first.")
    return x_user_id
