export type RagDoc = { id: string; title: string; text: string };

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "it", "as",
  "at", "by", "be", "this", "that", "with", "from", "are", "was", "were", "but",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/**
 * Compact BM25 over in-memory chunks. Good enough for a personal knowledge
 * library without a vector database.
 */
export function retrieve(query: string, docs: RagDoc[], k = 6): RagDoc[] {
  const qTerms = tokenize(query);
  if (qTerms.length === 0 || docs.length === 0) return [];

  const k1 = 1.5;
  const b = 0.75;
  const tokenized = docs.map((d) => tokenize(d.text));
  const avgdl = tokenized.reduce((s, t) => s + t.length, 0) / Math.max(tokenized.length, 1);
  const df = new Map<string, number>();
  for (const terms of tokenized) {
    for (const t of new Set(terms)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length;

  const scored = docs.map((doc, i) => {
    const terms = tokenized[i];
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of qTerms) {
      const f = tf.get(qt) ?? 0;
      if (!f) continue;
      const n = df.get(qt) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + k1 * (1 - b + b * (terms.length / avgdl));
      score += idf * ((f * (k1 + 1)) / denom);
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.doc);
}

export function formatRagContext(docs: RagDoc[]): string {
  if (docs.length === 0) return "";
  const lines = [
    "Retrieved knowledge from the user's library. Prefer these when they answer the question. Cite the document name.",
    "",
  ];
  docs.forEach((d, i) => {
    lines.push(`[${i + 1}] ${d.title}`);
    lines.push(d.text.slice(0, 1200));
    lines.push("");
  });
  return lines.join("\n").slice(0, 6000);
}
