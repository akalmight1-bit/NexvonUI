# Nexvon

**A clean, focused AI companion.**

Nexvon is a polished, production-style chat interface powered by xAI. Conversations persist locally and stream in real time.

## Features

- Real-time streaming responses (xAI Grok)
- Multi-conversation sidebar with timestamps
- Copy & regenerate message actions
- Keyboard shortcuts: `⌘/Ctrl+N` new chat · `Esc` stop generation
- Light / dark theme with system-friendly tokens
- Local persistence (Zustand + localStorage)
- Responsive mobile layout with glass sidebar

## Stack

- React 19 + TanStack Start / Router
- Tailwind CSS v4 + custom design tokens
- Zustand (persisted chat state)
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

Nexvon aims to feel like a finished product rather than a demo: intentional motion, glass surfaces, micro-feedback on copy, and a calm empty state.

---

Built with care.
