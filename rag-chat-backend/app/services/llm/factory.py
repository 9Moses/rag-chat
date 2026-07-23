"""
Factory that returns the configured LLM provider.
Selection is driven entirely by the LLM_PROVIDER env var — no code
changes needed to switch between Groq and OpenAI.
"""
from functools import lru_cache

from app.config import get_settings
from app.services.llm.base import LLMProvider
from app.services.llm.groq_provider import GroqProvider
from app.services.llm.openai_provider import OpenAIProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "openai":
        return OpenAIProvider()
    return GroqProvider()
