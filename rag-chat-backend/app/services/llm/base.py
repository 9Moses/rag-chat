"""
Abstract LLM provider interface.
Everything downstream (the /chat router) codes against this interface only —
never against Groq or OpenAI directly. Swapping providers is then a
one-line change in the factory, not a rewrite.
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    @abstractmethod
    async def stream_chat(self, messages: list[dict]) -> AsyncIterator[str]:
        """
        messages: [{"role": "system"|"user"|"assistant", "content": "..."}]
        Yields text chunks as they're generated.
        """
        raise NotImplementedError
