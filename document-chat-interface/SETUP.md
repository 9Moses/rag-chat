# Chat with Documents - Frontend Setup

A modern, user-friendly document chat interface built with Next.js 16, TypeScript, and Tailwind CSS. This frontend connects to a FastAPI RAG backend to enable asking questions about uploaded documents.

## Features

- **Clean Identity Flow**: Email-only authentication with automatic account creation
- **Document Management**: Upload PDFs with real-time processing status polling
- **Streaming Chat**: Token-by-token response streaming for natural conversation feel
- **Conversation History**: Organized sidebar with past conversations
- **Professional Design**: Soft teal/sage accent colors with dark mode support, not AI-focused aesthetic
- **User-Friendly Colors**: Carefully chosen palette focused on clarity and productivity

## Project Structure

```
app/
  layout.tsx              # Root layout with UserProvider
  page.tsx                # Main two-pane application shell
  globals.css             # Theme colors and design tokens

components/
  EmailGate.tsx           # Identity modal (email-only flow)
  Sidebar.tsx             # Left sidebar container
  DocumentList.tsx        # Document list with checkboxes and status
  DocumentUploadButton.tsx # PDF upload with drag-drop support
  ConversationList.tsx    # Conversation history
  ChatPanel.tsx           # Main chat area
  MessageBubble.tsx       # Message display component
  ChatInput.tsx           # Message input with markdown support

lib/
  types.ts                # TypeScript interfaces
  api.ts                  # API client functions
  sse.ts                  # SSE stream parser
  storage.ts              # localStorage helpers

hooks/
  useDocuments.ts         # Document management
  useConversations.ts     # Conversation management
  useChat.ts              # Streaming chat logic
  useLocalStorage.ts      # Persistent state helper

context/
  UserContext.tsx         # Global user state
```

## Environment Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Backend URL

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Replace `http://localhost:8000` with your FastAPI backend URL.

### 3. Start Development Server

```bash
pnpm dev
```

The app will open at `http://localhost:3000` in dark mode by default.

## Backend Integration

### Required API Endpoints

The frontend expects the following endpoints from the FastAPI backend:

#### 1. User Identification
- **POST** `/users/identify`
- Request: `{ "email": "user@example.com" }`
- Response: `{ "user_id": "uuid" }`
- Headers required: None (initial auth)

#### 2. Document Upload
- **POST** `/documents/upload`
- Request: FormData with `file` field (PDF)
- Response: `{ "id": "uuid", "filename": "file.pdf", "status": "processing", "created_at": "ISO8601" }`
- Headers required: `X-User-Id: <user_id>`

#### 3. Get Documents
- **GET** `/documents`
- Response: `[{ "id": "uuid", "filename": "file.pdf", "status": "ready|processing|failed", "created_at": "ISO8601", "error_message": "..." }]`
- Headers required: `X-User-Id: <user_id>`

#### 4. Get Document Status
- **GET** `/documents/{document_id}/status`
- Response: `{ "id": "uuid", "filename": "file.pdf", "status": "ready|processing|failed", ... }`
- Headers required: `X-User-Id: <user_id>`
- Used for polling every 2 seconds during processing

#### 5. Delete Document
- **DELETE** `/documents/{document_id}`
- Headers required: `X-User-Id: <user_id>`

#### 6. Get Conversations
- **GET** `/conversations`
- Response: `[{ "id": "uuid", "title": "First question...", "created_at": "ISO8601", "updated_at": "ISO8601" }]`
- Headers required: `X-User-Id: <user_id>`

#### 7. Delete Conversation
- **DELETE** `/conversations/{conversation_id}`
- Headers required: `X-User-Id: <user_id>`

#### 8. Chat Streaming
- **POST** `/chat`
- Request: `{ "message": "...", "conversation_id": "uuid|null", "selected_document_ids": ["uuid1", "uuid2"] }`
- Response: Server-Sent Events stream
- Headers required: `X-User-Id: <user_id>`

**SSE Events:**
```
event: conversation
data: {"conversation_id": "new-or-existing-uuid"}

event: token
data: {"token": "word "}

event: citations
data: {"citations": [{"document_id": "uuid", "document_name": "file.pdf", "snippet": "..."}]}

event: done
data: {}

event: error
data: {"error_message": "Something went wrong"}
```

## Key Design Decisions

### Not AI-Focused
The interface emphasizes productivity and practical usage rather than highlighting AI capabilities. Copy is plain and straightforward.

### Color System
- **Light Mode**: Off-white backgrounds (#f9fafb), soft dark text, teal accent (#52b8b8 in oklch)
- **Dark Mode**: Deep gray backgrounds (#0f172a), light text, muted teal accent
- **Status Badges**: Green (ready), yellow (processing), red (failed)

### User State Management
- Email and user_id stored in localStorage for persistence
- Context API for global user state
- React hooks for feature-specific state (documents, conversations, messages)

### Streaming Implementation
Uses native `fetch` with `ReadableStream` and custom SSE parser (not EventSource) to support POST requests with custom headers. Tokens render progressively for natural feel.

### Document Polling
While documents are processing, the app polls `/documents/{id}/status` every 2 seconds. Status badges show "Processing..." with pulse animation.

## Customization

### Theme Colors
Edit `app/globals.css` to modify the oklch color values:

```css
:root {
  --primary: oklch(0.52 0.15 160);      /* Accent color */
  --background: oklch(0.98 0 0);        /* Page background */
  /* ... see file for all options ... */
}
```

### Typography
Default system font stack. To use a custom font:

1. Import in `app/layout.tsx`:
   ```tsx
   import { Inter } from 'next/font/google'
   const inter = Inter({ subsets: ['latin'] })
   ```

2. Apply to body via className

### Messages
Message text is plain; no markdown rendering by default. To add markdown support, add `react-markdown` and update `MessageBubble.tsx`.

## Testing

### Without Backend
The frontend validates structure and shows helpful error messages when the backend is unavailable. Use browser DevTools console to debug API errors.

### With Backend
Once backend is running:
1. Enter any email to create/identify user
2. Upload a PDF document
3. Wait for processing to complete (status changes to "Ready")
4. Select document and ask a question
5. Watch streaming response appear token-by-token

## Deployment

### Vercel
1. Connect GitHub repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
CMD ["pnpm", "start"]
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Requires ES2020 features

## Performance Notes

- Lazy loads conversation history on demand
- Documents list fetched once on mount, then polled for status
- Messages streamed progressively (no batch loading)
- LocalStorage for user persistence (no network required for already-logged-in users)

## Known Limitations

- No multi-file upload (one at a time)
- No auto-save of draft messages
- Citation snippets empty from backend (ready to display if provided)
- No pagination for large document/conversation lists
