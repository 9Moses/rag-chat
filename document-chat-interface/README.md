# Chat with Documents - RAG Frontend

A modern, user-friendly document chat interface built with Next.js 16, TypeScript, and Tailwind CSS. Upload PDFs and ask questions using AI-powered retrieval-augmented generation (RAG).

**Design Philosophy**: Professional, practical, and calm—not marketing-focused. Soft teal accent colors, dark mode support, and a clean two-pane layout.

## Features

- 📄 **PDF Upload** - Upload documents with drag-and-drop, real-time processing status
- 💬 **Streaming Chat** - Token-by-token response rendering for natural conversation
- 📚 **Conversation History** - Save and load past conversations
- 🎨 **Professional Design** - Soft teal accent colors, responsive layout, dark mode
- 🔐 **Simple Auth** - Email-only identification, no passwords
- 📡 **Connection & Health Monitoring** - Real-time detection of network/server disconnections with auto & manual reconnect/refresh
- 🔒 **Encrypted Credential Storage** - AES encrypted `localStorage` helpers for secure credential persistence
- ⚡ **Fast & Responsive** - Optimistic UI, smart polling, streaming responses

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- FastAPI backend running on `http://localhost:8000`

### 2. Installation

```bash
# Clone and install
git clone <repo>
cd chat-with-documents
pnpm install
```

### 3. Configure Backend

Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 4. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In**: Enter your email (no password needed)
2. **Upload Document**: Drag a PDF or click to upload
3. **Wait for Processing**: Status shows "Processing..." → "Ready"
4. **Select Document**: Check the box next to your document
5. **Ask Questions**: Type a question and press Enter
6. **View Response**: Watch the AI response stream token-by-token

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed installation and configuration guide
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Architecture, design decisions, and code highlights
- **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** - Complete API specification for backend developers

## Architecture

```
┌─────────────────────────────────────────┐
│           Main App (page.tsx)           │
│  - UserContext for identity             │
│  - Hooks for state management           │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴───────────┬──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌────────────┐  ┌────────────┐  ┌──────────────┐
│  Sidebar   │  │ ChatPanel  │  │  EmailGate   │
│ - Docs     │  │ - Messages │  │ - Email Form │
│ - History  │  │ - Input    │  └──────────────┘
└────────────┘  └────────────┘
    │                  │
    └──────┬───────────┘
           │
    ┌──────┴──────────────────────────┐
    │       Custom Hooks              │
    │ - useDocuments                  │
    │ - useConversations              │
    │ - useChat (streaming)           │
    │ - useLocalStorage               │
    └─────────────────────────────────┘
           │
    ┌──────┴──────────────────────────┐
    │     API & Utilities             │
    │ - api.ts (fetch calls)          │
    │ - sse.ts (stream parser)        │
    │ - types.ts (interfaces)         │
    │ - storage.ts (localStorage)     │
    └─────────────────────────────────┘
           │
           ▼
    ┌────────────────────┐
    │  FastAPI Backend   │
    │  (CORS enabled)    │
    └────────────────────┘
```

## Key Components

### `components/`
- **EmailGate** - Identity modal with email validation
- **Sidebar** - Left sidebar with documents and conversations
- **ChatPanel** - Main chat area with message history
- **ChatInput** - Message input with markdown support
- **DocumentList** - Document list with status badges
- **ConversationList** - Past conversations
- **MessageBubble** - Message display with filename citation pills
- **ConnectionStatusBanner** - Disconnection alert banner with manual & auto reconnect trigger

### `hooks/`
- **useDocuments** - Document upload, polling, selection
- **useConversations** - Conversation management
- **useChat** - Streaming chat with SSE parsing
- **useConnectionStatus** - Real-time browser network & backend `/health` monitoring
- **useLocalStorage** - Persistent state helper

### `context/`
- **UserContext** - Global user identity and auth state

### `lib/`
- **api.ts** - All backend API calls
- **sse.ts** - Server-Sent Events stream parser
- **types.ts** - TypeScript interfaces
- **storage.ts** - Encrypted `localStorage` helpers (`crypto-js` AES encryption)

## Design System

### Colors
- **Accent**: Soft teal/sage green (`oklch(0.64 0.15 160)`)
- **Background**: Off-white light mode, deep gray dark mode
- **Status**: Green (ready), Yellow (processing), Red (failed)

## API Integration

The frontend expects these endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check & server connection monitoring |
| POST | `/users/identify` | Create/identify user |
| POST | `/documents/upload` | Upload PDF |
| GET | `/documents` | List documents |
| GET | `/documents/{id}/status` | Check processing status |
| DELETE | `/documents/{id}` | Delete document |
| GET | `/conversations` | List conversations |
| DELETE | `/conversations/{id}` | Delete conversation |
| POST | `/chat` | Send message (SSE stream) |

See **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** for complete API specification.

## Development

### Project Structure
```
app/                    # Next.js app router
  layout.tsx           # Root layout
  page.tsx             # Main app
  globals.css          # Theme & styles

components/            # React components
  EmailGate.tsx
  Sidebar.tsx
  ChatPanel.tsx
  ... (see above)

context/               # React context
  UserContext.tsx

hooks/                 # Custom hooks
  useDocuments.ts
  useConversations.ts
  useChat.ts
  useLocalStorage.ts

lib/                   # Utilities
  api.ts
  sse.ts
  types.ts
  storage.ts

public/                # Static assets
  icon.svg
  apple-icon.png
```

### Build & Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Deploy to Vercel
vercel
```

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Requires ES2020+

## Performance

- **Initial Load**: ~120KB gzipped
- **LCP**: <2s with Turbopack
- **Streaming**: Progressive token rendering (no batching)
- **Polling**: Smart 2s intervals for document status only
- **Caching**: localStorage for user persistence

## Error Handling

All errors are caught and displayed to users with helpful messages:
- Network errors: "Failed to fetch"
- Validation errors: Field-specific messages
- API errors: Server error message
- Stream errors: Graceful degradation

## Testing

```bash
# Run tests (if added)
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Security Notes

- User identity (email & `user_id`) stored in `localStorage` encrypted using AES (`crypto-js`)
- `X-User-Id` header attached automatically to all non-public requests
- CORS headers enforced by backend for authorized origin access
- HTTPS recommended for production environments

## Known Limitations

- One document upload at a time
- No draft message auto-save
- Citation snippets empty from backend (ready when provided)
- No pagination for large lists

## Support & Contributing

For issues or questions:
1. Check [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) for API issues
2. Check [SETUP.md](./SETUP.md) for configuration issues
3. Check [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture questions
4. Open an issue in the repository

## License

MIT

## Acknowledgments

- Built with [Next.js 16](https://nextjs.org)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [lucide-react](https://lucide.dev)

---

**Questions?** Check the documentation files or review the code comments throughout the project.
