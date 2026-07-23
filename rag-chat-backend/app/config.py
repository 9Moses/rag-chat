"""
Centralized app configuration.
All environment variables are read once here — nothing else in the app
should call os.getenv directly. This keeps config swappable and testable.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_storage_bucket: str = "documents"

    # LLM provider selection
    llm_provider: str = "groq"  # "groq" | "openai"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # App behavior
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000"
    max_upload_mb: int = 25
    chunk_size_tokens: int = 700
    chunk_overlap_tokens: int = 100
    top_k_chunks: int = 6

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
