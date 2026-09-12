import { createFileRoute } from "@tanstack/react-router";
import { backendFetch, isBackendConfigured } from "@/lib/backend.server";
import { processFormFiles } from "@/lib/files.server";

export const Route = createFileRoute("/api/files")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();

        if (isBackendConfigured()) {
          try {
            const res = await backendFetch("/v1/files", { method: "POST", body: form });
            if (res?.ok) return new Response(res.body, { headers: res.headers, status: res.status });
          } catch {
            /* fall through to local processing */
          }
        }

        try {
          const files = await processFormFiles(form);
          if (files.length === 0) {
            return Response.json({ error: "No files uploaded." }, { status: 400 });
          }
          return Response.json({ files });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Could not process files." },
            { status: 400 },
          );
        }
      },
    },
  },
});
