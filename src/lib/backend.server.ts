/**
 * Server-only link to NexvonBackend.
 *
 * Set NEXVON_API_URL (no VITE_ prefix — stays off the client) to the deployed
 * FastAPI origin, e.g. https://api.example.com. The UI always talks same-origin
 * `/api/*`; this module is the BFF hop that keeps CORS and secrets off the browser.
 */
export function getBackendUrl(): string | null {
  const raw =
    process.env.NEXVON_API_URL?.trim() ||
    process.env.VITE_API_URL?.trim() ||
    "";
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isBackendConfigured(): boolean {
  return Boolean(getBackendUrl());
}

export async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const base = getBackendUrl();
  if (!base) return null;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, {
    ...init,
    headers,
  });
}

export async function probeBackend(): Promise<{
  configured: boolean;
  connected: boolean;
  health?: Record<string, unknown>;
}> {
  const base = getBackendUrl();
  if (!base) return { configured: false, connected: false };
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { configured: true, connected: false };
    const health = (await res.json()) as Record<string, unknown>;
    return { configured: true, connected: true, health };
  } catch {
    return { configured: true, connected: false };
  }
}
