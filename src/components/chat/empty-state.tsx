import { useChatStore } from "@/lib/chat/store";
import { Button } from "@/components/ui/button";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = useChatStore((s) => s.suggestions);

  return (
    <div className="flex flex-1 flex-col items-center justify-end px-5 pb-2 text-center pointer-events-none">
      <div className="anim-fade max-w-xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-glass px-3 py-1 text-[11px] tracking-[0.2em] text-accent uppercase pointer-events-none">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          Live · Online
        </div>
        <h1 className="font-display text-4xl text-fg italic tracking-tight sm:text-5xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]">
          Nexvon
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted drop-shadow-[0_1px_12px_rgba(0,0,0,0.8)]">
          An observatory intelligence orbiting Gargantua. Drag the void. Click to disturb
          spacetime. Then ask.
        </p>
      </div>
      <div className="mt-6 mb-2 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2 pointer-events-auto">
        {suggestions.map((s, i) => (
          <Button
            key={s}
            variant="chip"
            className="anim-chip max-w-full justify-start text-left"
            style={{ animationDelay: `${120 + i * 70}ms` }}
            onClick={() => onPick(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
