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
};

/** Same-origin `/api/chat`, or `VITE_API_URL` if the UI is split from the API. */
function chatEndpoint() {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  if (base) return `${base}/v1/chat`;
  return "/api/chat";
}

export async function listChatProviders(): Promise<PublicProvider[]> {
  try {
    const res = await fetch(chatEndpoint(), { method: "GET" });
    if (!res.ok) return [];
    const body = (await res.json()) as { providers?: PublicProvider[] };
    return Array.isArray(body.providers) ? body.providers : [];
  } catch {
    return [];
  }
}

export async function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  handlers: StreamHandlers,
) {
  const res = await fetch(chatEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      stream: true,
      provider: handlers.provider && handlers.provider !== "auto" ? handlers.provider : undefined,
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
