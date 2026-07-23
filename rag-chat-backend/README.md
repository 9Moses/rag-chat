# RAG Chat with Documents — Backend

FastAPI backend for a chat-with-your-documents app. Upload PDFs, ask
questions in natural language, get answers grounded in your files with
page-level citations. No auth — just email-based identity.

## Stack

- **API**: FastAPI (Python, async, streaming responses)
- **DB + Vector Store**: Supabase Postgres + pgvector (free tier)
- **File Storage**: Supabase Storage (free tier)
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` — runs locally, no API key, no cost
- **LLM**: Groq (`llama-3.3-70b-versatile`, free tier) — swappable to OpenAI via one env var
- **Identity**: email-only, no passwords/sessions — see [Identity Model](#identity-model)

---

## 1. One-time Supabase Setup (~5 minutes)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the entire contents of `sql/schema.sql` → Run.
   This creates all tables, the `match_chunks` similarity-search function, the HNSW vector index, and the `documents` storage bucket.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (NOT the `anon` key — the backend needs elevated access to bypass row-level security since there's no per-request auth token) → `SUPABASE_KEY`

## 2. Get a free Groq API key

1. Sign up at [console.groq.com](https://console.groq.com) (free)
2. Create an API key → `GROQ_API_KEY`

*(Optional: if you'd rather use OpenAI, get a key from platform.openai.com, set `LLM_PROVIDER=openai` and `OPENAI_API_KEY` instead.)*

## 3. Configure environment

```bash
cp .env.example .env
# then edit .env and fill in SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY
```

## 4. Run with Docker (recommended)

```bash
docker-compose up --build
```

API will be live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## 5. Run without Docker (local dev)

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Note: first run will download the embedding model (~90MB) and tiktoken's
BPE file — needs internet access once, then it's cached locally.

---

## Identity Model

There's no login system. Instead:

1. Frontend calls `POST /users/identify {"email": "..."}` once, on load
2. Backend looks up the email in the `users` table:
   - Exists → returns the existing `user_id` (UUID)
   - New → creates a row, returns a fresh `user_id`
3. Frontend stores `user_id` (e.g. in `localStorage`) and sends it as an
   `X-User-Id` header on every subsequent request
4. All documents, conversations, and messages are scoped to that `user_id`

**Trade-off to be aware of:** anyone who enters a known email sees that
email's history — there's no password verification. This is intentional,
for simplicity. If you need real security later, add a magic-link email
verification step to `/users/identify` without changing anything else.

---

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Backend health check & connection status ping |
| POST | `/users/identify` | Get-or-create a user by email |
| POST | `/documents/upload` | Upload a PDF (multipart), starts background processing |
| GET | `/documents` | List the caller's documents |
| GET | `/documents/{id}/status` | Poll ingestion status: `processing` \| `ready` \| `failed` |
| DELETE | `/documents/{id}` | Delete a document + its chunks + its file |
| POST | `/chat` | Ask a question (SSE streaming response) |
| GET | `/conversations` | List the caller's past conversations |
| GET | `/conversations/{id}/messages` | Full message history + citations for a conversation |
| DELETE | `/conversations/{id}` | Delete a conversation |

All routes except `/health` and `/users/identify` require an `X-User-Id: <uuid>` header.

### `POST /chat` — Server-Sent Events

Request:
```json
{
  "message": "What does the contract say about termination?",
  "document_ids": ["uuid1", "uuid2"],
  "conversation_id": null
}
```

Response is `text/event-stream` with these events, in order:
1. `event: conversation` — `{"conversation_id": "..."}` (only for new conversations, but always sent)
2. `event: token` — `{"text": "..."}`, streamed repeatedly as the answer generates
3. `event: citations` — `[{"document_id", "filename", "page_number", "chunk_id"}, ...]`
4. `event: done` — stream complete

---

## Architecture Notes

- **Why pgvector instead of a dedicated vector DB?** One database for
  everything (users, documents, chunks+vectors, conversations) means one
  connection, one backup, one place to look. pgvector with an HNSW index
  comfortably handles millions of vectors — you won't outgrow it at
  small-to-medium scale. The vector logic lives entirely in
  `app/services/vector_store.py`, so migrating to Qdrant/Pinecone later
  is a contained change, not a rewrite.

- **Why BackgroundTasks instead of Celery?** Simpler to run (no Redis, no
  worker process) and sufficient until upload concurrency actually
  becomes a bottleneck. `app/services/ingestion.py` is written as a
  self-contained function specifically so it can be dropped into a Celery
  task later with no logic changes — only the trigger mechanism changes.

- **Why local embeddings?** `all-MiniLM-L6-v2` runs on CPU, needs no API
  key, costs nothing, and is fast enough for this use case. It's loaded
  once at process start (`@lru_cache`) and kept warm in memory.

- **LLM provider abstraction**: `app/services/llm/` defines an abstract
  `LLMProvider` with `GroqProvider` and `OpenAIProvider` implementations.
  Switching providers is a single env var (`LLM_PROVIDER`) — no code
  changes anywhere else.

## Scaling Path (when you actually need it)

1. Upload volume growing? Swap `BackgroundTasks` → Celery + Upstash Redis
   (free tier) — `ingestion.py` logic doesn't need to change.
2. Retrieval quality plateauing? Add a reranking step (cross-encoder,
   still free/local) between initial vector search and prompt assembly.
3. Outgrowing Supabase free tier limits (500MB DB / 1GB storage)? Upgrade
   the Supabase plan, or self-host Postgres+pgvector — the app code
   doesn't change, only `SUPABASE_URL`/`SUPABASE_KEY`.
4. Vector search getting slow at huge scale? Migrate `vector_store.py` to
   a dedicated vector DB (Qdrant is free to self-host). This is the last
   thing to reach for, not the first.

## Project Structure

```
app/
├── main.py                 # FastAPI app assembly
├── config.py                # Env-driven settings (single source of truth)
├── database.py               # Supabase client singleton
├── dependencies.py           # X-User-Id header validation
├── models/schemas.py         # Pydantic request/response models
├── routers/
│   ├── users.py               # POST /users/identify
│   ├── documents.py           # upload/list/status/delete
│   ├── chat.py                # RAG endpoint, SSE streaming
│   └── conversations.py       # history retrieval
├── services/
│   ├── pdf_parser.py           # PyMuPDF page-aware extraction
│   ├── embeddings.py           # local sentence-transformers
│   ├── vector_store.py         # pgvector insert + similarity search
│   ├── storage.py              # Supabase Storage upload/download
│   ├── ingestion.py            # ties parsing+chunking+embedding together
│   ├── prompt_builder.py       # RAG prompt assembly + citation instructions
│   └── llm/
│       ├── base.py              # LLMProvider abstract interface
│       ├── groq_provider.py     # default
│       ├── openai_provider.py   # alternative
│       └── factory.py           # env-driven provider selection
└── utils/chunking.py         # token-aware chunking with overlap
sql/schema.sql               # full Supabase schema + RPC function
```
