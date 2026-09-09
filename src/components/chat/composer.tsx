import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled || streaming) return;
    onSend(text);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl px-4 pb-5 sm:px-6">
      <div
        className={cn(
          "nx-glass-strong flex items-end gap-2 rounded-xl p-2 transition-shadow duration-200",
          "focus-within:shadow-[0_0_0_1px_rgba(127,220,255,0.22)]",
        )}
      >
        <label className="sr-only" htmlFor="nexvon-input">
          Message Nexvon
        </label>
        <textarea
          id="nexvon-input"
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask Nexvon…"
          className="min-h-11 max-h-40 flex-1 bg-transparent px-3 py-2.5 text-base text-fg placeholder:text-faint sm:text-sm"
          autoComplete="off"
          spellCheck
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating (Esc)"
            title="Stop · Esc"
            className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-md bg-fg text-bg transition-transform duration-150 active:scale-[0.96]"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Send"
            className={cn(
              "mb-0.5 grid size-11 shrink-0 place-items-center rounded-md bg-fg text-bg transition-[transform,opacity] duration-150 active:scale-[0.96]",
              !value.trim() && "opacity-35",
            )}
          >
            <ArrowUp className="size-5" strokeWidth={2.25} />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] tracking-wide text-faint">
        Enter to send · Shift+Enter for a new line · ⌘N new chat
      </p>
    </form>
  );
}
