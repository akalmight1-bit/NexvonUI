import { listChatProviders, type PublicProvider } from "@/lib/chat/stream";
import { useChatStore } from "@/lib/chat/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ProviderSelect({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const preferredProvider = useChatStore((s) => s.preferredProvider);
  const setPreferredProvider = useChatStore((s) => s.setPreferredProvider);
  const streaming = useChatStore((s) => s.streaming);
  const [providers, setProviders] = useState<PublicProvider[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listChatProviders().then((list) => {
      if (!cancelled) setProviders(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  const value = providers.some((p) => p.id === preferredProvider) ? preferredProvider : "auto";
  const current = providers.find((p) => p.id === value);

  return (
    <div className={cn("min-w-0", className)}>
      {compact ? null : (
        <p className="mb-1.5 text-xs text-faint">
          Auto tries every configured backend. A specific pick stays on that API.
        </p>
      )}
      <select
        id="nexvon-provider"
        aria-label="Model provider"
        value={value}
        disabled={streaming}
        onChange={(e) => setPreferredProvider(e.target.value)}
        className={cn(
          "w-full truncate rounded-md border border-border bg-transparent px-2.5 py-2 text-sm text-fg outline-none",
          "hover:bg-fg/5 disabled:opacity-50",
          compact && "h-9 w-auto max-w-[10.5rem] py-1.5 text-xs",
        )}
      >
        <option value="auto">Auto{providers.length > 1 ? " · fallback" : ""}</option>
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {compact || !current ? null : (
        <p className="mt-1.5 text-2xs text-faint">Model: {current.model}</p>
      )}
    </div>
  );
}
