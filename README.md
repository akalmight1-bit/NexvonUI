# Nexvon

**A cinematic AI companion** with a live Schwarzschild black hole behind the glass.

Nexvon is a polished, production-style chat interface powered by xAI. Conversations persist locally, stream in real time, and sit on a reactive WebGL / CSS black-hole backdrop.

## Features

- Real-time streaming responses (xAI Grok)
- Multi-conversation sidebar with timestamps
- Copy & regenerate message actions
- Keyboard shortcuts: `⌘/Ctrl+N` new chat · `Esc` stop generation
- Light / dark theme with system-friendly tokens
- Local persistence (Zustand + localStorage)
- Responsive mobile layout with glass sidebar
- Live Schwarzschild visualization (WebGL with graceful CSS fallback)

## Stack

- React 19 + TanStack Start / Router
- Tailwind CSS v4 + custom design tokens
- Zustand (persisted chat state)
- Three.js / custom WebGL for the black-hole field
- xAI Chat Completions API

## Getting started

```bash
npm install
npm run dev
```

The app expects `XAI_API_KEY` in the environment for live replies. Without it, the UI still loads and shows a clear offline state.

## Keyboard

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `⌘/Ctrl+N` | New conversation |
| `Esc` | Stop generation |

## Design notes

Nexvon aims to feel like a finished product rather than a demo: intentional motion, glass surfaces, micro-feedback on copy, and a calm empty state that still feels alive.

---

Built with care.
