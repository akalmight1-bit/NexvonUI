export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  engine?: "brave" | "serper";
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function configuredSearchEngines(): Array<"brave" | "serper"> {
  const engines: Array<"brave" | "serper"> = [];
  if (env("BRAVE_API_KEY")) engines.push("brave");
  if (env("SERPER_API_KEY")) engines.push("serper");
  return engines;
}

export function isSearchConfigured(): boolean {
  return configuredSearchEngines().length > 0;
}

async function braveSearch(query: string): Promise<SearchHit[]> {
  const key = env("BRAVE_API_KEY");
  if (!key) throw new Error("Brave Search is not configured.");

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query.slice(0, 400));
  url.searchParams.set("count", "8");
  url.searchParams.set("text_decorations", "false");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: { meta?: { message?: string } }; message?: string };
      detail = j.error?.meta?.message || j.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
    infobox?: { results?: { title?: string; description?: string; url?: string }[] };
  };

  const hits: SearchHit[] = [];
  for (const item of data.infobox?.results ?? []) {
    if (!item.title || !item.description) continue;
    hits.push({
      title: item.title,
      url: item.url || "",
      snippet: item.description,
      source: "infobox",
      engine: "brave",
    });
  }
  for (const item of data.web?.results ?? []) {
    if (!item.title || !item.url) continue;
    hits.push({
      title: item.title,
      url: item.url,
      snippet: item.description ?? "",
      engine: "brave",
    });
  }
  return hits;
}

async function serperSearch(query: string): Promise<SearchHit[]> {
  const key = env("SERPER_API_KEY");
  if (!key) throw new Error("Serper is not configured.");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query.slice(0, 400), num: 8 }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      if (j.message) detail = j.message;
      else if (j.error) detail = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as {
    organic?: { title?: string; link?: string; snippet?: string }[];
    knowledgeGraph?: { title?: string; description?: string; website?: string; type?: string };
    answerBox?: { title?: string; answer?: string; snippet?: string; link?: string };
    news?: { title?: string; link?: string; snippet?: string; source?: string }[];
  };

  const hits: SearchHit[] = [];
  const answer = data.answerBox;
  if (answer) {
    const snippet = [answer.answer, answer.snippet].filter(Boolean).join(" — ");
    if (snippet) {
      hits.push({
        title: answer.title || "Answer",
        url: answer.link || "",
        snippet,
        source: "answer box",
        engine: "serper",
      });
    }
  }
  const kg = data.knowledgeGraph;
  if (kg?.title && kg.description) {
    hits.push({
      title: kg.type ? `${kg.title} (${kg.type})` : kg.title,
      url: kg.website || "",
      snippet: kg.description,
      source: "knowledge graph",
      engine: "serper",
    });
  }
  for (const item of data.organic ?? []) {
    if (!item.title || !item.link) continue;
    hits.push({
      title: item.title,
      url: item.link,
      snippet: item.snippet ?? "",
      engine: "serper",
    });
  }
  for (const item of data.news ?? []) {
    if (!item.title || !item.link) continue;
    hits.push({
      title: item.title,
      url: item.link,
      snippet: item.snippet ?? "",
      source: item.source,
      engine: "serper",
    });
  }
  return hits;
}

function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = "";
    const host = u.hostname.replace(/^www\./, "");
    return `${host}${u.pathname.replace(/\/$/, "")}${u.search}`;
  } catch {
    return url;
  }
}

function mergeHits(groups: SearchHit[][]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const group of groups) {
    for (const hit of group) {
      const key = hit.url ? normalizeUrl(hit.url) : `${hit.title}:${hit.snippet.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
    }
  }
  return out.slice(0, 12);
}

/**
 * Dual search: Brave + Serper in parallel when both keys exist.
 * One engine failing does not fail the other.
 */
export async function webSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const preferred = env("SEARCH_PROVIDER").toLowerCase();
  const tasks: Promise<SearchHit[]>[] = [];

  const useBrave = env("BRAVE_API_KEY") && preferred !== "serper";
  const useSerper = env("SERPER_API_KEY") && preferred !== "brave";

  if (useBrave) tasks.push(braveSearch(q).catch(() => []));
  if (useSerper) tasks.push(serperSearch(q).catch(() => []));
  if (tasks.length === 0) throw new Error("Search is not configured.");

  const groups = await Promise.all(tasks);
  return mergeHits(groups);
}

export function formatSearchResults(query: string, results: SearchHit[]): string {
  if (results.length === 0) {
    return `No web results for "${query}".`;
  }

  const lines = [`Web search results for "${query}":`, ""];
  results.forEach((r, i) => {
    const via = r.engine ? ` · ${r.engine}` : "";
    lines.push(`${i + 1}. ${r.title}${via}`);
    if (r.url) lines.push(`   ${r.url}`);
    if (r.snippet) lines.push(`   ${r.snippet}`);
    lines.push("");
  });
  lines.push(
    "Use these sources. Cite titles/URLs when you rely on a specific result. Do not invent URLs.",
  );
  return lines.join("\n");
}
