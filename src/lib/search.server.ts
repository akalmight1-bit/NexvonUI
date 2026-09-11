export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
};

export function isSearchConfigured(): boolean {
  return Boolean(process.env.SERPER_API_KEY?.trim());
}

export async function serperSearch(query: string): Promise<SearchHit[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) throw new Error("Search is not configured.");

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
    const snippet = [answer.answer, answer.snippet].filter(Boolean).join(" \u2014 ");
    if (snippet) {
      hits.push({
        title: answer.title || "Answer",
        url: answer.link || "",
        snippet,
        source: "answer box",
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
    });
  }

  for (const item of data.organic ?? []) {
    if (!item.title || !item.link) continue;
    hits.push({
      title: item.title,
      url: item.link,
      snippet: item.snippet ?? "",
    });
  }

  for (const item of data.news ?? []) {
    if (!item.title || !item.link) continue;
    hits.push({
      title: item.title,
      url: item.link,
      snippet: item.snippet ?? "",
      source: item.source,
    });
  }

  return hits.slice(0, 10);
}

export function formatSearchResults(query: string, results: SearchHit[]): string {
  if (results.length === 0) {
    return `No web results for "${query}".`;
  }

  const lines = [`Web search results for "${query}":`, ""];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
    if (r.url) lines.push(`   ${r.url}`);
    if (r.snippet) lines.push(`   ${r.snippet}`);
    lines.push("");
  });
  lines.push(
    "Use these sources. Cite titles/URLs when you rely on a specific result. Do not invent URLs.",
  );
  return lines.join("\n");
}
