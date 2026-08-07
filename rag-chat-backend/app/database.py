"""
Supabase client singleton.
Used for both Postgres access (via the supabase-py query builder / RPC)
and Storage access (raw file uploads).
"""
from functools import lru_cache
from typing import Callable, TypeVar

import httpcore
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
from supabase import Client, create_client

from app.config import get_settings

R = TypeVar("R")

retryable_supabase_errors = (
    httpx.RemoteProtocolError,
    httpx.TransportError,
    httpcore.ProtocolError,
)


@retry(
    retry=retry_if_exception_type(retryable_supabase_errors),
    wait=wait_exponential(multiplier=0.5, min=1, max=4),
    stop=stop_after_attempt(3),
    reraise=True,
)
def execute_supabase_query(fn: Callable[..., R], *args, **kwargs) -> R:
    return fn(*args, **kwargs)


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)
