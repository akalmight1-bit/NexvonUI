import { useEffect, useRef, useState } from "react";
import { Check, Copy, File as FileIcon, RotateCcw } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { Logo } from "./logo";

function MessageAttachments({ message }: { message: ChatMessage }) {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) return null;
  const images = attachments.filter((a) => a.kind === "image");
  const files = attachments.filter((a) => a.kind !== "image");

  return (
    <div className="mb-1.5 flex max-w-[min(100%,36rem)] flex-wrap justify-end gap-1.5">
      {images.map((a) => (
        <img
          key={a.id}
          src={a.dataUrl}
          alt={a.name}
          className="size-24 rounded-lg object-cover shadow-[var(--shadow-border)]"
        />
      ))}
      {files.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
        >
          <FileIcon className="size-4 text-faint" />
          <span className="max-w-[10rem] truncate font-medium text-fg">{a.name}</span>
        </div>
      ))}
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Nexvon is writing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-fg"
          style={{
            animation: "typingBounce 1.1s ease-in-out infinite",
            animationDelay: `${i * 0.14}s`,
          }}
        />
      ))}
    </div>
  );
}

function MessageActions({
  content,
  canRegenerate,
  onCopy,
  onRegenerate,
}: {
  content: string;
  canRegenerate: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy();
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy message"}
        className="grid size-8 place-items-center rounded-sm text-faint transition-colors hover:bg-fg/8 hover:text-fg"
      >
        {copied ? <Check className="size-3.5 text-fg" /> : <Copy className="size-3.5" />}
      </button>
      {canRegenerate && onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate response"
          className="grid size-8 place-items-center rounded-sm text-faint transition-colors hover:bg-fg/8 hover:text-fg"
        >
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function MessageList({
  messages,
  streaming,
  onRegenerate,
  onCopied,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  onRegenerate?: () => void;
  onCopied?: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          const showTyping = streaming && isLast && !isUser && !m.content;
          const showCaret = streaming && isLast && !isUser && Boolean(m.content);
          const canRegenerate =
            !streaming && isLast && !isUser && Boolean(m.content) && Boolean(onRegenerate);

          return (
            <article
              key={m.id}
              className={cn("anim-msg group flex gap-3", isUser ? "justify-end" : "justify-start")}
            >
              {!isUser ? (
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-elevated text-fg shadow-[var(--shadow-border)]">
                  <Logo className="size-4" />
                </div>
              ) : null}
              <div className={cn("flex min-w-0 flex-col", isUser ? "items-end" : "items-start")}>
                {isUser ? (
                  <>
                    <MessageAttachments message={m} />
                    {m.content ? (
                      <div className="max-w-[min(100%,36rem)] rounded-lg rounded-br-sm bg-surface px-4 py-3 text-sm leading-relaxed text-fg">
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="max-w-[min(100%,40rem)] text-sm text-fg">
                    {showTyping ? (
                      <Typing />
                    ) : (
                      <>
                        <Markdown text={m.content} />
                        {showCaret ? (
                          <span
                            className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-fg"
                            style={{ animation: "caret 1s steps(1) infinite" }}
                            aria-hidden
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                {!showTyping && m.content ? (
                  <MessageActions
                    content={m.content}
                    canRegenerate={canRegenerate}
                    onCopy={() => onCopied?.()}
                    onRegenerate={canRegenerate ? onRegenerate : undefined}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
