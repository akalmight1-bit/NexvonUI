import { useEffect, useRef, type ReactNode } from "react";
import { Moon, Sun, Trash2, X } from "lucide-react";
import { useChatStore } from "@/lib/chat/store";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function SettingsModal() {
  const open = useChatStore((s) => s.settingsOpen);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const theme = useChatStore((s) => s.theme);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const clearAll = useChatStore((s) => s.clearAll);
  const conversations = useChatStore((s) => s.conversations);
  const user = useCurrentUser();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSettingsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setSettingsOpen]);

  if (!open) return null;

  const email = user?.primaryEmail ?? "—";
  const name = user?.displayName ?? user?.primaryEmail ?? "Guest";
  const initials = (user?.displayName ?? user?.primaryEmail ?? "G")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "G";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        aria-label="Close settings"
        onClick={() => setSettingsOpen(false)}
        style={{ animation: "overlayFade 180ms ease-out" }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-[var(--elevated)] shadow-2xl outline-none"
        style={{ animation: "fadeUp 200ms var(--ease-out) both" }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="settings-title" className="text-base font-semibold text-fg">
            Settings
          </h2>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="grid size-9 place-items-center rounded-md text-faint transition-colors hover:bg-fg/8 hover:text-fg"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto px-5 py-4">
          <Section title="Account">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 px-3.5 py-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="size-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{name}</p>
                <p className="truncate text-xs text-faint">{email}</p>
              </div>
            </div>
          </Section>

          <Section title="Appearance">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
              <div>
                <p className="text-sm font-medium text-fg">Theme</p>
                <p className="text-xs text-faint">
                  {theme === "dark" ? "Dark" : "Light"} mode
                </p>
              </div>
              <div className="flex rounded-lg border border-border p-0.5">
                <ThemeButton
                  active={theme === "light"}
                  onClick={() => theme !== "light" && toggleTheme()}
                  label="Light"
                  icon={<Sun className="size-4" />}
                />
                <ThemeButton
                  active={theme === "dark"}
                  onClick={() => theme !== "dark" && toggleTheme()}
                  label="Dark"
                  icon={<Moon className="size-4" />}
                />
              </div>
            </div>
          </Section>

          <Section title="Data">
            <div className="rounded-xl border border-border px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-fg">Conversation history</p>
                  <p className="mt-0.5 text-xs text-faint">
                    {conversations.length === 0
                      ? "No conversations stored"
                      : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"} on this device`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={conversations.length === 0}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all conversations? This cannot be undone.",
                      )
                    ) {
                      clearAll();
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    conversations.length === 0
                      ? "cursor-not-allowed text-faint opacity-40"
                      : "text-danger hover:bg-danger/10",
                  )}
                >
                  <Trash2 className="size-3.5" />
                  Clear all
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-faint">
                Chats are stored locally in your browser. Clearing removes them
                from this device only.
              </p>
            </div>
          </Section>

          <Section title="About">
            <div className="rounded-xl border border-border px-3.5 py-3 text-sm text-muted">
              <p className="font-medium text-fg">Nexvon</p>
              <p className="mt-1 text-xs leading-relaxed text-faint">
                A focused AI companion powered by xAI. Conversations stream in
                real time and stay on your device.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-1">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ThemeButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "text-muted hover:text-fg",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
