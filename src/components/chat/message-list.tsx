import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { Logo } from "./logo";

function Typing() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1" aria-label="Nexvon is writing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-accent"
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
        className="grid size-8 place-items-center rounded-xs text-faint transition-colors hover:bg-fg/8 hover:text-fg"
      >
        {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
      </button>
      {canRegenerate && onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate response"
          className="grid size-8 place-items-center rounded-xs text-faint transition-colors hover:bg-fg/8 hover:text-fg"
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          const showTyping = streaming && isLast && !isUser && !m.content;
          const canRegenerate =
            !streaming && isLast && !isUser && Boolean(m.content) && Boolean(onRegenerate);

          return (
            <article
              key={m.id}
              className={cn(
                "anim-msg group flex gap-3",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              {!isUser ? (
                <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-glass-strong text-accent ring-1 ring-border">
                  <Logo className="size-4" />
                </div>
              ) : null}
              <div className={cn("flex min-w-0 flex-col", isUser ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[min(100%,40rem)] rounded-lg px-4 py-3 text-sm",
                    isUser
                      ? "rounded-br-xs bg-fg text-bg"
                      : "nx-glass-strong rounded-bl-xs text-fg",
                  )}
                >
                  {showTyping ? (
                    <Typing />
                  ) : isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  ) : (
                    <Markdown text={m.content} />
                  )}
                </div>
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
