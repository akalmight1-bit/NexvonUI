import { createFileRoute } from "@tanstack/react-router";
import {
  hasAnyProviderConfigured,
  orderProviders,
  publicProviderList,
  type ProviderConfig,
} from "@/lib/providers.server";
import { formatSearchResults, isSearchConfigured, serperSearch } from "@/lib/search.server";

const SYSTEM = `You are Nexvon, a thoughtful AI companion. Be clear, warm, and direct — no fluff, no emoji, no filler praise. Help with thinking, writing, code, science, and decisions. Use markdown when it helps: headings, lists, and fenced code. Be concise unless the user wants depth. Sound like a sharp friend, not a corporate assistant. When you have a search tool available, use it for anything that depends on current or fast-changing information instead of guessing.`;

type IncomingPart =
  | { type?: string; text?: string }
  | { type?: string; image_url?: { url?: string } };

type IncomingMessage = {
  role?: string;
  content?: string | IncomingPart[];
};

type Incoming = {
  messages?: IncomingMessage[];
  provider?: string;
};

type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>> | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

const MAX_IMAGE_PARTS_PER_MESSAGE = 6;
const MAX_TEXT_LENGTH = 8000;
const MAX_TOOL_ROUNDS = 2; // 1 tool round, then a forced final answer

/** Validates and sanitizes one message's content, or returns null to drop the message. */
function sanitizeContent(content: unknown): string | Array<Record<string, unknown>> | null {
  if (typeof content === "string") {
    const trimmed = content.slice(0, MAX_TEXT_LENGTH);
    return trimmed.trim().length > 0 ? trimmed : null;
  }
  if (!Array.isArray(content)) return null;
  const parts: Array<Record<string, unknown>> = [];
  let imageCount = 0;
  for (const raw of content) {
    if (!raw || typeof raw !== "object") continue;
    const part = raw as IncomingPart;
    if (part.type === "text" && "text" in part && typeof part.text === "string") {
      const text = part.text.slice(0, MAX_TEXT_LENGTH);
      if (text.trim()) parts.push({ type: "text", text });
      continue;
    }
    if (part.type === "image_url" && "image_url" in part) {
      const url = part.image_url?.url;
      // Only allow inline base64 image data — never arbitrary remote URLs (avoids SSRF-style abuse).
      if (
        imageCount < MAX_IMAGE_PARTS_PER_MESSAGE &&
        typeof url === "string" &&
        /^data:image\/(png|jpe?g|gif|webp);base64,/.test(url)
      ) {
        parts.push({ type: "image_url", image_url: { url } });
        imageCount += 1;
      }
    }
  }
  return parts.length > 0 ? parts : null;
}

function sanitizeProvider(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim().toLowerCase();
  if (!id || id === "auto") return undefined;
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(id)) return undefined;
  return id;
}

/**
 * Tools available to the model. Gated on their own env var so an unconfigured
 * tool just doesn't show up — chat still works with zero tools.
 * Add a RAG tool the same way: a ToolDef here + a handler in `runTool`.
 */
function buildTools(): ToolDef[] {
  const tools: ToolDef[] = [];
  if (isSearchConfigured()) {
    tools.push({
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the web. Use for anything current, fast-changing, or that you're not certain about: news, prices, recent releases, who/what/when facts.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "The search query." } },
          required: ["query"],
        },
      },
    });
  }
  return tools;
}

async function runTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    /* malformed arguments — proceed with empty args */
  }
  if (name === "web_search") {
    const query = typeof args.query === "string" ? args.query : "";
    if (!query.trim()) return "No search query provided.";
    try {
      const results = await serperSearch(query);
      return formatSearchResults(query, results);
    } catch (err) {
      return `Search failed: ${err instanceof Error ? err.message : "unknown error"}`;
    }
  }
  return `Unknown tool: ${name}`;
}

async function fetchProvider(
  provider: ProviderConfig,
  messages: ApiMessage[],
  tools: ToolDef[],
  allowTools: boolean,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
  };
  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/akalmight1-bit/NexvonUI";
    headers["X-Title"] = "Nexvon";
  }

  return fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider.model,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
      messages,
      ...(allowTools && tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
    }),
  });
}

/**
 * Tries each provider in the ordered chain. Auto mode walks every configured
 * backend; a specific pick uses that backend only.
 */
async function callUpstream(
  messages: ApiMessage[],
  tools: ToolDef[],
  allowTools: boolean,
  preferred?: string,
) {
  const chain = orderProviders(preferred);
  if (chain.length === 0) {
    throw new Error("No chat provider is configured.");
  }
  const failures: string[] = [];
  for (const provider of chain) {
    try {
      const res = await fetchProvider(provider, messages, tools, allowTools);
      if (res.ok && res.body) return { res, provider };
      let detail = `HTTP ${res.status}`;
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        if (j.error?.message) detail = j.error.message;
      } catch {
        /* ignore */
      }
      failures.push(`${provider.label}: ${detail}`);
    } catch (err) {
      failures.push(`${provider.label}: ${err instanceof Error ? err.message : "network error"}`);
    }
  }
  throw new Error(`All providers failed — ${failures.join("; ")}`);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          providers: publicProviderList(),
          search: isSearchConfigured(),
        });
      },
      POST: async ({ request }) => {
        if (!hasAnyProviderConfigured()) {
          return Response.json(
            { error: "Nexvon is offline in this environment." },
            { status: 503 },
          );
        }

        let body: Incoming;
        try {
          body = (await request.json()) as Incoming;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const preferred = sanitizeProvider(body.provider);
        const raw = Array.isArray(body.messages) ? body.messages : [];
        const messages: ApiMessage[] = raw
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-32)
          .map((m) => ({ role: m.role as "user" | "assistant", content: sanitizeContent(m.content) }))
          .filter((m): m is ApiMessage => m.content !== null);

        if (messages.length === 0 || messages.at(-1)?.role !== "user") {
          return Response.json({ error: "Send a message first." }, { status: 400 });
        }

        const tools = buildTools();
        const conversation: ApiMessage[] = [{ role: "system", content: SYSTEM }, ...messages];

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (obj: Record<string, unknown>) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            try {
              for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                const isLastRound = round === MAX_TOOL_ROUNDS - 1;
                let upstream: Response;
                let active: ProviderConfig;
                try {
                  const result = await callUpstream(conversation, tools, !isLastRound, preferred);
                  upstream = result.res;
                  active = result.provider;
                } catch (err) {
                  send({ error: err instanceof Error ? err.message : "All providers failed." });
                  controller.close();
                  return;
                }

                if (round === 0) {
                  send({ provider: active.name, status: `Using ${active.label}` });
                }

                const reader = upstream.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let finishReason: string | null = null;
                const pendingCalls = new Map<number, { id: string; name: string; args: string }>();

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() ?? "";
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    const payload = trimmed.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;
                    let json: {
                      choices?: {
                        delta?: {
                          content?: string;
                          tool_calls?: {
                            index: number;
                            id?: string;
                            function?: { name?: string; arguments?: string };
                          }[];
                        };
                        finish_reason?: string | null;
                      }[];
                    };
                    try {
                      json = JSON.parse(payload);
                    } catch {
                      continue; // skip malformed chunk
                    }
                    const choice = json.choices?.[0];
                    const delta = choice?.delta;
                    if (choice?.finish_reason) finishReason = choice.finish_reason;
                    if (delta?.tool_calls) {
                      for (const tc of delta.tool_calls) {
                        const entry = pendingCalls.get(tc.index) ?? {
                          id: tc.id ?? "",
                          name: "",
                          args: "",
                        };
                        if (tc.id) entry.id = tc.id;
                        if (tc.function?.name) entry.name += tc.function.name;
                        if (tc.function?.arguments) entry.args += tc.function.arguments;
                        pendingCalls.set(tc.index, entry);
                      }
                      continue; // don't forward tool-call deltas as text
                    }
                    if (delta?.content) {
                      send({ text: delta.content });
                    }
                  }
                }

                if (pendingCalls.size === 0) {
                  send({ done: true });
                  controller.close();
                  return;
                }

                const calls = [...pendingCalls.values()];
                for (const c of calls) {
                  if (c.name === "web_search") {
                    let q = "";
                    try {
                      q = JSON.parse(c.args || "{}").query ?? "";
                    } catch {
                      /* ignore */
                    }
                    send({ status: q ? `Searching the web for "${q}"…` : "Searching the web…" });
                  }
                }

                conversation.push({
                  role: "assistant",
                  content: null,
                  tool_calls: calls.map((c) => ({
                    id: c.id,
                    type: "function",
                    function: { name: c.name, arguments: c.args },
                  })),
                });
                for (const c of calls) {
                  const result = await runTool(c.name, c.args);
                  conversation.push({ role: "tool", tool_call_id: c.id, content: result });
                }
                void finishReason;
              }

              send({ error: "Nexvon couldn't finish that response." });
              controller.close();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Stream failed";
              try {
                send({ error: message });
                controller.close();
              } catch {
                /* already closed */
              }
            }
          },
          cancel() {
            /* upstream readers are per-round and released as we go */
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
