"""
Pydantic models for request/response validation.
Keeping these separate from DB models keeps the API contract explicit
and decoupled from how data is actually stored.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# ---------- Users ----------

class IdentifyRequest(BaseModel):
    email: EmailStr


class IdentifyResponse(BaseModel):
    user_id: UUID
    email: str
    is_new_user: bool


# ---------- Documents ----------

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    page_count: Optional[int] = None
    created_at: datetime
    error_message: Optional[str] = None


class DocumentStatusResponse(BaseModel):
    id: UUID
    status: str
    page_count: Optional[int] = None
    error_message: Optional[str] = None


# ---------- Chat ----------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    document_ids: list[UUID] = Field(default_factory=list)
    conversation_id: Optional[UUID] = None


class Citation(BaseModel):
    document_id: UUID
    filename: str
    page_number: Optional[int]
    snippet: str


# ---------- Conversations ----------

class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    citations: list[Citation] = Field(default_factory=list)
