# Nexvon

A focused AI companion. Streaming chat, dual web search, files, and a private knowledge library.

## What talks to what

The browser **only** calls same-origin `/api/*`. Those routes either:

1. Run locally (OpenAI-compatible keys + Brave/Serper), or
2. Proxy to **NexvonBackend** when `NEXVON_API_URL` is set on the **server**.

That is the deploy-safe split: UI on grok.me / Vercel / Netlify, API on any Python host. No CORS required from the browser.

```env
# UI server env (do not prefix with VITE_)
NEXVON_API_URL=https://your-backend.example.com

# Local chat fallback if the backend is down
XAI_API_KEY=
OPENAI_API_KEY=

# Search (one or both)
BRAVE_API_KEY=
SERPER_API_KEY=
```

| UI route | Backend |
|----------|---------|
| `POST /api/chat` | `POST /v1/chat` |
| `GET /api/chat` | `GET /v1/models` |
| `POST /api/search` | `POST /v1/search` |
| `POST /api/files` | `POST /v1/files` |
| `POST /api/rag` | `POST /v1/rag/ingest` or `/v1/rag/query` |

## Features

- Real-time streaming, auto fallback across providers
- Attach images and text files (drag, paste, or paperclip)
- Knowledge library (RAG) — retrieve on every turn
- Brave + Serper search when keys are present
- Conversations persist locally

## Keyboard

| Shortcut | Action |
|----------|--------|
| Enter | Send |
| Shift+Enter | New line |
| ⌘/Ctrl+N | New chat |
| Esc | Stop |

Backend repo: [NexvonBackend](https://github.com/akalmight1-bit/NexvonBackend)
