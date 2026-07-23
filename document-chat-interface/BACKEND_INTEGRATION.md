# Backend Integration Guide

## Quick Start

### For FastAPI Backend Developers

This frontend expects a FastAPI backend running on `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL`).

## CORS Configuration

Add CORS middleware to your FastAPI app:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Required Endpoints

### 1. POST `/users/identify`

**Purpose**: Create or retrieve user by email

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error** (400 Bad Request):
```json
{
  "error_code": "INVALID_EMAIL",
  "error_message": "Invalid email format"
}
```

---

### 2. POST `/documents/upload`

**Purpose**: Upload and process a PDF document

**Request**: `multipart/form-data`
- File field: `file` (PDF file)

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "filename": "report.pdf",
  "status": "processing",
  "created_at": "2026-07-22T10:00:00Z",
  "error_message": null
}
```

**Headers**:
- `X-User-Id: <user_id>` (required)

**Notes**:
- Status should immediately be "processing" (not "ready")
- Backend processes PDF asynchronously
- Frontend polls status endpoint for completion

---

### 3. GET `/documents`

**Purpose**: List all documents for the user

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "filename": "report.pdf",
    "status": "ready",
    "created_at": "2026-07-22T10:00:00Z",
    "error_message": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "filename": "notes.pdf",
    "status": "processing",
    "created_at": "2026-07-22T10:05:00Z",
    "error_message": null
  }
]
```

**Headers**:
- `X-User-Id: <user_id>` (required)

---

### 4. GET `/documents/{document_id}/status`

**Purpose**: Check processing status of a specific document (for polling)

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "filename": "report.pdf",
  "status": "ready",
  "created_at": "2026-07-22T10:00:00Z",
  "error_message": null
}
```

**Headers**:
- `X-User-Id: <user_id>` (required)

**Polling Behavior**:
- Frontend polls every 2 seconds
- Poll stops when status is "ready" or "failed"
- Frontend expects status to be one of: `"processing"`, `"ready"`, `"failed"`

---

### 5. DELETE `/documents/{document_id}`

**Purpose**: Delete a document

**Response** (204 No Content or 200 OK)

**Headers**:
- `X-User-Id: <user_id>` (required)

---

### 6. GET `/conversations`

**Purpose**: List all conversations for the user

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "title": "What is the main topic of this document?",
    "created_at": "2026-07-22T10:30:00Z",
    "updated_at": "2026-07-22T10:32:00Z"
  }
]
```

**Headers**:
- `X-User-Id: <user_id>` (required)

---

### 7. DELETE `/conversations/{conversation_id}`

**Purpose**: Delete a conversation

**Response** (204 No Content or 200 OK)

**Headers**:
- `X-User-Id: <user_id>` (required)

---

### 8. POST `/chat` (Streaming)

**Purpose**: Send a message and receive streaming response

**Request**:
```json
{
  "message": "What are the main points?",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440010",
  "selected_document_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Note about conversation_id**:
- If `null`: Create a new conversation
- If provided: Add message to existing conversation

**Response** (200 OK with SSE stream):

```
event: conversation
data: {"conversation_id": "550e8400-e29b-41d4-a716-446655440010"}

event: token
data: {"token": "The "}

event: token
data: {"token": "main "}

event: token
data: {"token": "points "}

event: citations
data: {"citations": [{"document_id": "550e8400-e29b-41d4-a716-446655440001", "document_name": "report.pdf", "snippet": ""}]}

event: done
data: {}
```

**Headers**:
- `X-User-Id: <user_id>` (required)
- `Content-Type: text/event-stream` (response)

**Event Format**:
Each SSE event is:
```
event: <event_type>
data: <json_string>

```

**Event Types**:

1. **conversation**: Sent first if conversation_id was null
   ```json
   {"conversation_id": "<newly_created_id>"}
   ```

2. **token**: Sent multiple times for streaming response
   ```json
   {"token": "<text_chunk>"}
   ```
   - Send one token at a time
   - Can be words, subwords, or punctuation
   - Frontend renders as received

3. **citations**: Sent after all tokens
   ```json
   {
     "citations": [
       {
         "document_id": "<id>",
         "document_name": "<filename>",
         "snippet": "<optional_context>"
       }
     ]
   }
   ```

4. **done**: Sent to signal end of stream
   ```json
   {}
   ```

5. **error**: Sent if error occurs mid-stream
   ```json
   {"error_message": "<user_friendly_message>"}
   ```

**Example Python Implementation**:

```python
from fastapi.responses import StreamingResponse
import json

@app.post("/chat")
async def chat(request: ChatRequest, user_id: str = Header("X-User-Id")):
    async def generate():
        # If conversation_id is None, create new one
        if not request.conversation_id:
            conv_id = create_conversation(user_id)
            yield f"event: conversation\ndata: {json.dumps({'conversation_id': conv_id})}\n\n"
        else:
            conv_id = request.conversation_id
        
        # Process query and get streaming response
        for token in stream_response(user_id, conv_id, request):
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
        
        # Get citations for selected documents
        citations = get_citations(user_id, conv_id, request.selected_document_ids)
        yield f"event: citations\ndata: {json.dumps({'citations': citations})}\n\n"
        
        # Signal completion
        yield f"event: done\ndata: {json.dumps({})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

## Testing the Integration

### Test 1: User Identification

```bash
curl -X POST http://localhost:8000/users/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response: `{"user_id":"<uuid>"}`

### Test 2: Document Upload

```bash
curl -X POST http://localhost:8000/documents/upload \
  -H "X-User-Id: <user_id>" \
  -F "file=@document.pdf"
```

Expected response: Document with status "processing"

### Test 3: Document Status Polling

```bash
curl -X GET http://localhost:8000/documents/<document_id>/status \
  -H "X-User-Id: <user_id>"
```

Repeat until status is "ready"

### Test 4: Chat Streaming

```bash
curl -X POST http://localhost:8000/chat \
  -H "X-User-Id: <user_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test question",
    "conversation_id": null,
    "selected_document_ids": ["<document_id>"]
  }' \
  -N
```

Expected: SSE stream with tokens appearing progressively

---

## Common Issues

### "Failed to fetch" Error
- **Cause**: CORS not enabled or backend not running
- **Fix**: 
  1. Verify backend is running on `NEXT_PUBLIC_API_URL`
  2. Check CORS middleware is configured
  3. Check `Access-Control-Allow-Origin` header in response

### Documents stuck on "Processing"
- **Cause**: `status` endpoint not returning "ready" or "failed"
- **Fix**: Ensure async processing completes and status is updated

### SSE not streaming
- **Cause**: Response header `Content-Type: text/event-stream` missing
- **Fix**: Add `media_type="text/event-stream"` to StreamingResponse

### Blank citations
- **Cause**: `snippet` is empty from backend
- **Fix**: This is OK! Frontend handles empty snippets gracefully

---

## Production Checklist

- [ ] CORS configured for production domain
- [ ] All error responses include `error_code` and `error_message`
- [ ] Streaming responses use correct SSE format
- [ ] Document processing is asynchronous
- [ ] User ID header validation on all protected endpoints
- [ ] Rate limiting (optional but recommended)
- [ ] Logging for debugging
- [ ] Tests for all endpoints
- [ ] SSL/TLS certificate for HTTPS deployment

---

## Environment Variables

Frontend side (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend side (`.env`):
```
FRONTEND_URL=http://localhost:3000
```

For production:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```
