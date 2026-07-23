"""
OpenAI provider — optional alternative, selected via LLM_PROVIDER=openai.
"""
from typing import AsyncIterator
from openai import AsyncOpenAI

from app.config import get_settings
from app.services.llm.base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

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
