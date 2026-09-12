import { createFileRoute } from "@tanstack/react-router";
import { backendFetch, isBackendConfigured } from "@/lib/backend.server";
import { configuredSearchEngines, isSearchConfigured, webSearch } from "@/lib/search.server";

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          enabled: isSearchConfigured(),
          engines: configuredSearchEngines(),
        }),
      POST: async ({ request }) => {
        let query = "";
        let num = 8;
        try {
          const body = (await request.json()) as { query?: string; q?: string; num?: number };
          query = (body.query || body.q || "").trim();
          if (typeof body.num === "number") num = body.num;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        if (!query) return Response.json({ error: "Missing query." }, { status: 400 });

        if (isBackendConfigured()) {
          try {
            const res = await backendFetch("/v1/search", {
              method: "POST",
              body: JSON.stringify({ query, num }),
            });
            if (res?.ok) return new Response(res.body, { headers: res.headers, status: res.status });
          } catch {
            /* fall through */
          }
        }

        if (!isSearchConfigured()) {
          return Response.json(
            { error: "Search is not configured. Set BRAVE_API_KEY and/or SERPER_API_KEY." },
            { status: 503 },
          );
        }

        try {
          const results = await webSearch(query);
          return Response.json({ query, results, engines: configuredSearchEngines() });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Search failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
