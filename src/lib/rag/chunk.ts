const MAX_CHUNK = 900;
const OVERLAP = 120;

export function chunkText(text: string, max = MAX_CHUNK, overlap = OVERLAP): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push(t);
    buf = t.slice(Math.max(0, t.length - overlap));
  };

  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > max && buf) {
      flush();
    }
    if (p.length > max) {
      const words = p.split(/\s+/);
      for (const w of words) {
        if ((buf + " " + w).length > max) flush();
        buf = buf ? `${buf} ${w}` : w;
      }
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  flush();
  return chunks.filter(Boolean);
}
