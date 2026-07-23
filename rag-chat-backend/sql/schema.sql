-- =====================================================
-- RAG Chat with Documents — Supabase Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor)
-- =====================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Users (email-only soft identity, no auth/password)
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    created_at timestamptz default now()
);

-- 3. Documents
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    filename text not null,
    storage_path text not null,           -- path in Supabase Storage bucket
    status text not null default 'processing', -- processing | ready | failed
    error_message text,
    page_count int,
    created_at timestamptz default now()
);

create index if not exists idx_documents_user_id on documents(user_id);

-- 4. Chunks (with embeddings)
-- NOTE: all-MiniLM-L6-v2 produces 384-dim vectors. If you switch embedding
-- models later, update this dimension and re-embed all chunks.
create table if not exists chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    content text not null,
    page_number int,
    chunk_index int,
    token_count int,
    embedding vector(384)
);

create index if not exists idx_chunks_document_id on chunks(document_id);

-- HNSW index for fast approximate nearest-neighbor search (cosine distance)
create index if not exists idx_chunks_embedding_hnsw
    on chunks using hnsw (embedding vector_cosine_ops);

-- 5. Conversations
create table if not exists conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    title text default 'New Conversation',
    created_at timestamptz default now()
);

create index if not exists idx_conversations_user_id on conversations(user_id);

-- 6. Messages
create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz default now()
);

create index if not exists idx_messages_conversation_id on messages(conversation_id);

-- 7. Message citations (links an assistant message back to source chunks)
create table if not exists message_citations (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references messages(id) on delete cascade,
    chunk_id uuid references chunks(id) on delete set null,
    document_id uuid references documents(id) on delete cascade,
    page_number int,
    filename text
);

create index if not exists idx_citations_message_id on message_citations(message_id);

-- =====================================================
-- RPC function for vector similarity search
-- Called from FastAPI via supabase-py .rpc()
-- Filters by allowed document_ids so users only ever search
-- documents they own.
-- =====================================================
create or replace function match_chunks (
    query_embedding vector(384),
    match_count int,
    filter_document_ids uuid[]
)
returns table (
    id uuid,
    document_id uuid,
    content text,
    page_number int,
    chunk_index int,
    similarity float
)
language sql stable
as $$
    select
        chunks.id,
        chunks.document_id,
        chunks.content,
        chunks.page_number,
        chunks.chunk_index,
        1 - (chunks.embedding <=> query_embedding) as similarity
    from chunks
    where chunks.document_id = any(filter_document_ids)
    order by chunks.embedding <=> query_embedding
    limit match_count;
$$;

-- =====================================================
-- Storage bucket (run once — or create via Supabase Dashboard > Storage)
-- =====================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
