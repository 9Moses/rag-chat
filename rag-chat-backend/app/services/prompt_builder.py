"""
Builds the message list sent to the LLM: system instructions + retrieved
context + recent conversation history + the new user question.
"""

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly using the provided document excerpts.

Rules:
- Only answer using information found in the "CONTEXT" section below. Do not use outside knowledge.
- If the answer isn't in the context, say clearly that the documents don't contain that information. Do not guess.
- When you use information from a source, cite it inline like [Source N] where N matches the numbered excerpt.
- Be concise and direct. Use the same language as the user's question.
"""


def format_context(chunks: list[dict]) -> str:
    """
    chunks: [{"content", "filename", "page_number"}, ...]
    Numbers each chunk so the model can cite [Source N] consistently.
    """
    if not chunks:
        return "No relevant context was found in the uploaded documents."

    parts = []
    for i, c in enumerate(chunks, start=1):
        page = f", page {c['page_number']}" if c.get("page_number") else ""
        parts.append(f"[Source {i}] ({c['filename']}{page})\n{c['content']}")
    return "\n\n".join(parts)


def build_messages(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    max_history_turns: int = 6,
) -> list[dict]:
    """
    history: [{"role": "user"|"assistant", "content": "..."}] in chronological order.
    Returns the full messages list ready to send to an LLMProvider.
    """
    context_str = format_context(context_chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Keep only the most recent turns to bound prompt size
    trimmed_history = history[-max_history_turns:] if history else []
    messages.extend(trimmed_history)

    user_turn = f"CONTEXT:\n{context_str}\n\nQUESTION:\n{question}"
    messages.append({"role": "user", "content": user_turn})

    return messages
