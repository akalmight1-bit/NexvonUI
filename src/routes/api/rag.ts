import { createFileRoute } from "@tanstack/react-router";
import { backendFetch, isBackendConfigured } from "@/lib/backend.server";
import { formatRagContext, retrieve, type RagDoc } from "@/lib/rag/bm25";
import { chunkText } from "@/lib/rag/chunk";

type IngestBody = {
  name?: string;
  text?: string;
  mimeType?: string;
};

type QueryBody = {
  query?: string;
  documents?: { id?: string; title?: string; name?: string; text?: string; chunks?: string[] }[];
  k?: number;
};

export const Route = createFileRoute("/api/rag")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: IngestBody & QueryBody & { action?: string } = {};
        try {
          body = (await request.json()) as IngestBody & QueryBody & { action?: string };
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const action = body.action === "ingest" ? "ingest" : "query";

        if (isBackendConfigured()) {
          try {
            const path = action === "ingest" ? "/v1/rag/ingest" : "/v1/rag/query";
            const res = await backendFetch(path, {
              method: "POST",
              body: JSON.stringify(body),
            });
            if (res?.ok) return new Response(res.body, { headers: res.headers, status: res.status });
          } catch {
            /* local fallback */
          }
        }

        if (action === "ingest") {
          const text = (body.text || "").trim();
          const name = (body.name || "Document").slice(0, 120);
          if (!text) return Response.json({ error: "Nothing to ingest." }, { status: 400 });
          const chunks = chunkText(text);
          return Response.json({
            name,
            mimeType: body.mimeType || "text/plain",
            chunks,
            chunkCount: chunks.length,
          });
        }

        const query = (body.query || "").trim();
        if (!query) return Response.json({ error: "Missing query." }, { status: 400 });

        const corpus: RagDoc[] = [];
        for (const doc of body.documents ?? []) {
          const title = doc.title || doc.name || "Document";
          const pieces = doc.chunks?.length ? doc.chunks : chunkText(doc.text || "");
          pieces.forEach((text, i) => {
            if (!text.trim()) return;
            corpus.push({ id: `${doc.id ?? title}:${i}`, title, text });
          });
        }
        const hits = retrieve(query, corpus, Math.min(Math.max(body.k ?? 6, 1), 12));
        return Response.json({
          query,
          results: hits,
          context: formatRagContext(hits),
        });
      },
    },
  },
});
