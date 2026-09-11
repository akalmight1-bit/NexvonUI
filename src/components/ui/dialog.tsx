import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-bg/60"
        style={{ animation: "overlayFade 200ms ease-out" }}
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexvon-dialog-title"
        className={cn(
          "relative z-10 flex max-h-[min(36rem,88dvh)] w-full max-w-md flex-col overflow-hidden",
          "rounded-t-xl border border-border bg-elevated shadow-[var(--shadow-soft)] sm:rounded-xl",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="nexvon-dialog-title" className="text-sm font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-sm text-faint hover:bg-fg/8 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
