# Nexvon

**A clean, focused AI companion.**

Nexvon is a polished chat interface that streams replies in real time. It is not locked to Grok — any OpenAI-compatible provider works. Conversations persist locally.

## Features

- Real-time streaming from multiple providers
- Auto fallback across every configured API, or pin one in Settings
- Multi-conversation sidebar with timestamps
- Copy & regenerate message actions
- Keyboard shortcuts: `⌘/Ctrl+N` new chat · `Esc` stop generation
- Light / dark theme
- Local persistence (Zustand + localStorage)
- Optional web search (`SERPER_API_KEY`)

## Stack

- React 19 + TanStack Start / Router
- Tailwind CSS v4 + custom design tokens
- Zustand (persisted chat state)
- OpenAI-compatible Chat Completions APIs

## Providers

Set the API key for any backend you want. Unset keys are skipped. **Auto** tries them in this order; Settings can pin one.

| Provider | Key | Optional model / base |
|----------|-----|------------------------|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL`, `OPENAI_BASE_URL` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL`, `GROQ_BASE_URL` |
| NVIDIA NIM | `NIM_API_KEY` | `NIM_MODEL`, `NIM_BASE_URL` |
| xAI Grok | `XAI_API_KEY` | `XAI_MODEL`, `XAI_BASE_URL` |
| Together | `TOGETHER_API_KEY` | `TOGETHER_MODEL`, `TOGETHER_BASE_URL` |
| Fireworks | `FIREWORKS_API_KEY` | `FIREWORKS_MODEL`, `FIREWORKS_BASE_URL` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL` |
| Mistral | `MISTRAL_API_KEY` | `MISTRAL_MODEL`, `MISTRAL_BASE_URL` |
| Custom | `CUSTOM_API_KEY` **and** `CUSTOM_API_BASE_URL` | `CUSTOM_MODEL` |
| Generic | `CHAT_API_KEY` | `CHAT_MODEL`, `CHAT_API_BASE_URL` |

`CHAT_*` is a leftover generic slot (defaults to OpenAI). Prefer `OPENAI_*` or `CUSTOM_*`.

Web search is separate: `SERPER_API_KEY`.

Without any chat key, the UI still loads and shows that Nexvon is offline.

## Getting started

```bash
npm install
npm run dev
```

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
