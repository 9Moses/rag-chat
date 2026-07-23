"""
FastAPI application entrypoint.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import chat, conversations, documents, users

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="RAG Chat with Documents API",
    description="Upload PDFs, ask questions, get cited answers from your own files.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(conversations.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "rag-chat-backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}
