import { Compass, Lightbulb, PenLine, Search } from "lucide-react";
import { useChatStore } from "@/lib/chat/store";
import { greetingForHour } from "@/lib/utils";
import type { Suggestion } from "@/lib/chat/types";

const ICONS = {
  decide: Compass,
  explain: Lightbulb,
  draft: PenLine,
  holes: Search,
} as const;

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = useChatStore((s) => s.suggestions);
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  return (
    <div className="anim-fade mx-auto w-full max-w-xl px-5">
      <p className="text-sm font-medium text-muted">{greeting}</p>
      <h1 className="mt-1 font-display text-3xl italic tracking-tight text-fg sm:text-5xl">
        What's on your mind?
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted max-sm:hidden">
        Nexvon is ready — thinking, writing, code, or a decision you don't want to rush.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
        {suggestions.map((s, i) => (
          <SuggestionCard key={s.id} suggestion={s} delay={80 + i * 50} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  delay,
  onPick,
}: {
  suggestion: Suggestion;
  delay: number;
  onPick: (text: string) => void;
}) {
  const Icon = ICONS[suggestion.id as keyof typeof ICONS] ?? Compass;
  return (
    <button
      type="button"
      onClick={() => onPick(suggestion.prompt)}
      className="anim-fade flex h-full min-h-11 flex-col rounded-lg border border-border bg-elevated p-3 text-left shadow-[var(--shadow-border)] transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.98] sm:p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="size-4 text-faint" />
      <p className="mt-2 text-sm font-semibold text-fg sm:mt-3">{suggestion.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted max-sm:hidden">{suggestion.hint}</p>
    </button>
  );
}
