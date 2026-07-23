"""
Supabase client singleton.
Used for both Postgres access (via the supabase-py query builder / RPC)
and Storage access (raw file uploads).
"""
from functools import lru_cache
from supabase import create_client, Client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)
