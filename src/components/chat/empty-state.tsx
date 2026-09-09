import { useChatStore } from "@/lib/chat/store";
import { Button } from "@/components/ui/button";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = useChatStore((s) => s.suggestions);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
      <div className="anim-fade max-w-xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-glass px-3 py-1 text-[11px] tracking-[0.2em] text-accent uppercase">
          <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          Live · Online
        </div>
        <h1 className="font-display text-5xl text-fg italic tracking-tight sm:text-6xl">
          Nexvon
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
          A cinematic AI companion. Ask anything — code, reasoning, writing, science.
          The Schwarzschild field stays behind the glass.
        </p>
      </div>
      <div className="mt-10 flex max-w-xl flex-wrap justify-center gap-2">
        {suggestions.map((s, i) => (
          <Button
            key={s}
            variant="chip"
            className="anim-chip max-w-full"
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
