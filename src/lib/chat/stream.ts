import { retrieve, type RagDoc } from "@/lib/rag/bm25";
import type { ChatMessage, KnowledgeDoc, ServiceStatus } from "./types";
import { toApiMessages } from "./payload";

export type PublicProvider = {
  id: string;
  label: string;
  model: string;
};

export type StreamHandlers = {
  onDelta: (text: string) => void;
  onStatus?: (status: string) => void;
  signal?: AbortSignal;
  provider?: string;
  knowledge?: KnowledgeDoc[];
};

function chatEndpoint() {
  return "/api/chat";
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const empty: ServiceStatus = {
    providers: [],
    search: { enabled: false, engines: [] },
    files: true,
    rag: true,
    backend: { configured: false, connected: false },
  };
  try {
    const res = await fetch(chatEndpoint(), { method: "GET" });
    if (!res.ok) return empty;
    const body = (await res.json()) as Partial<ServiceStatus> & { providers?: PublicProvider[] };
    return {
      providers: Array.isArray(body.providers) ? body.providers : [],
      search: body.search ?? empty.search,
      files: body.files !== false,
      rag: body.rag !== false,
      backend: body.backend ?? empty.backend,
    };
  } catch {
    return empty;
  }
}

export async function listChatProviders(): Promise<PublicProvider[]> {
  const status = await getServiceStatus();
  return status.providers;
}

function knowledgeHits(query: string, docs: KnowledgeDoc[]): RagDoc[] {
  const corpus: RagDoc[] = [];
  for (const doc of docs) {
    const pieces = doc.chunks.length > 0 ? doc.chunks : [doc.text];
    pieces.forEach((text, i) => {
      corpus.push({
        id: `${doc.id}:${i}`,
        title: doc.name,
        text,
      });
    });
  }
  return retrieve(query, corpus, 6);
}

export async function streamChat(messages: ChatMessage[], handlers: StreamHandlers) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content || "";
  const knowledge = handlers.knowledge?.length
    ? knowledgeHits(query, handlers.knowledge).map((d) => ({ title: d.title, text: d.text }))
    : [];

  const res = await fetch(chatEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: toApiMessages(messages),
      stream: true,
      provider: handlers.provider && handlers.provider !== "auto" ? handlers.provider : undefined,
      knowledge,
    }),
    signal: handlers.signal,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      if (body.error) detail = body.error;
      else if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (!res.body) throw new Error("No response stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          text?: string;
          error?: string;
          status?: string;
        };
        if (json.error) throw new Error(json.error);
        if (json.status) handlers.onStatus?.(json.status);
        if (json.text) handlers.onDelta(json.text);
      } catch (err) {
        if (err instanceof Error && err.message !== "Unexpected end of JSON input") {
          if ((err as SyntaxError).name === "SyntaxError") continue;
          throw err;
        }
      }
    }
  }
}
