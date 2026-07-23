"""
Conversation history — lets a returning user (identified by email) pick up
past chats instantly.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_supabase
from app.dependencies import get_current_user_id
from app.models.schemas import Citation, ConversationResponse, MessageResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
def list_conversations(user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    result = (
        supabase.table("conversations")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [ConversationResponse(**c) for c in result.data]


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(conversation_id: UUID, user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()

    convo = (
        supabase.table("conversations")
        .select("id")
        .eq("id", str(conversation_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not convo.data:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_id", str(conversation_id))
        .order("created_at")
        .execute()
    )

    message_ids = [m["id"] for m in messages.data]
    citations_by_message: dict[str, list[Citation]] = {mid: [] for mid in message_ids}

    if message_ids:
        citations = (
            supabase.table("message_citations")
            .select("*")
            .in_("message_id", message_ids)
            .execute()
        )
        for c in citations.data:
            citations_by_message.setdefault(c["message_id"], []).append(
                Citation(
                    document_id=c["document_id"],
                    filename=c.get("filename", "unknown"),
                    page_number=c.get("page_number"),
                    snippet="",
                )
            )

    return [
        MessageResponse(
            id=m["id"],
            role=m["role"],
            content=m["content"],
            created_at=m["created_at"],
            citations=citations_by_message.get(m["id"], []),
        )
        for m in messages.data
    ]


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: UUID, user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    result = (
        supabase.table("conversations")
        .select("id")
        .eq("id", str(conversation_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    supabase.table("conversations").delete().eq("id", str(conversation_id)).execute()
    return {"deleted": True}
