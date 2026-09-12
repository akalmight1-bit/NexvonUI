import type { ChatMessage } from "./types";

export type ApiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ApiMessage = {
  role: "user" | "assistant";
  content: string | ApiContentPart[];
};

export function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-32)
    .map((m) => {
      const atts = m.attachments ?? [];
      if (atts.length === 0) {
        return { role: m.role, content: m.content };
      }
      const parts: ApiContentPart[] = [];
      if (m.content.trim()) parts.push({ type: "text", text: m.content });
      for (const a of atts) {
        if (a.kind === "image" && a.dataUrl?.startsWith("data:image/")) {
          parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
        } else if (a.kind === "text" && a.textContent) {
          parts.push({
            type: "text",
            text: `\n\n[File: ${a.name}]\n${a.textContent.slice(0, 12000)}`,
          });
        } else {
          parts.push({
            type: "text",
            text: `\n\n[Attached file: ${a.name} (${a.mimeType}) — contents not inlined]`,
          });
        }
      }
      return { role: m.role, content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts };
    })
    .filter((m) => {
      if (typeof m.content === "string") return m.content.trim().length > 0;
      return m.content.length > 0;
    });
}
