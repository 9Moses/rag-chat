"""
Groq provider — default LLM, free tier, very fast inference.
"""
from typing import AsyncIterator
from groq import AsyncGroq

from app.config import get_settings
from app.services.llm.base import LLMProvider


class GroqProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    async def stream_chat(self, messages: list[dict]) -> AsyncIterator[str]:
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
