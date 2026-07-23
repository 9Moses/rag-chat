"""
The core RAG endpoint: retrieve relevant chunks, build a prompt, stream the
LLM's answer back over Server-Sent Events, then persist the message + citations.
"""
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.database import get_supabase
from app.dependencies import get_current_user_id
from app.models.schemas import ChatRequest
from app.services import vector_store
from app.services.llm.factory import get_llm_provider
from app.services.prompt_builder import build_messages

router = APIRouter(prefix="/chat", tags=["chat"])


def _get_or_create_conversation(supabase, user_id: str, conversation_id: UUID | None, first_message: str) -> str:
    if conversation_id:
        result = (
            supabase.table("conversations")
            .select("id")
            .eq("id", str(conversation_id))
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return str(conversation_id)

    title = (first_message[:60] + "...") if len(first_message) > 60 else first_message
    created = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": title,
    }).execute()
    return created.data[0]["id"]


def _get_history(supabase, conversation_id: str) -> list[dict]:
    result = (
        supabase.table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return result.data


def _filenames_for_documents(supabase, document_ids: list[str]) -> dict[str, str]:
    if not document_ids:
        return {}
    result = supabase.table("documents").select("id, filename").in_("id", document_ids).execute()
    return {d["id"]: d["filename"] for d in result.data}


@router.post("")
async def chat(payload: ChatRequest, user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()

    if not payload.document_ids:
        raise HTTPException(status_code=400, detail="Select at least one document to chat with.")

    conversation_id = _get_or_create_conversation(
        supabase, user_id, payload.conversation_id, payload.message
    )

    # 1. Retrieve relevant chunks
    raw_chunks = vector_store.similarity_search(payload.message, payload.document_ids)
    filenames = _filenames_for_documents(supabase, [c["document_id"] for c in raw_chunks])
    context_chunks = [
        {
            "content": c["content"],
            "page_number": c.get("page_number"),
            "filename": filenames.get(c["document_id"], "document"),
            "document_id": c["document_id"],
            "chunk_id": c["id"],
        }
        for c in raw_chunks
    ]

    # 2. Build prompt with history
    history = _get_history(supabase, conversation_id)
    messages = build_messages(payload.message, context_chunks, history)

    # 3. Persist the user message now
    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": payload.message,
    }).execute()

    llm = get_llm_provider()

    async def event_stream():
        full_response = ""

        # First SSE event: tell the frontend which conversation this belongs to
        yield f"event: conversation\ndata: {json.dumps({'conversation_id': conversation_id})}\n\n"

        async for token in llm.stream_chat(messages):
            full_response += token
            yield f"event: token\ndata: {json.dumps({'text': token})}\n\n"

        # Persist assistant message + citations once streaming completes
        assistant_msg = supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": full_response,
        }).execute().data[0]

        citation_rows = [
            {
                "message_id": assistant_msg["id"],
                "chunk_id": c["chunk_id"],
                "document_id": c["document_id"],
                "page_number": c["page_number"],
                "filename": c["filename"],
            }
            for c in context_chunks
        ]
        if citation_rows:
            supabase.table("message_citations").insert(citation_rows).execute()

        yield f"event: citations\ndata: {json.dumps([{k: v for k, v in c.items() if k != 'content'} for c in context_chunks])}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
