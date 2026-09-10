import type { ReactNode } from "react";
import { Moon, Sun, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useChatStore } from "@/lib/chat/store";
import { cn } from "@/lib/utils";

export function SettingsModal() {
  const open = useChatStore((s) => s.settingsOpen);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const theme = useChatStore((s) => s.theme);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const clearAll = useChatStore((s) => s.clearAll);
  const conversations = useChatStore((s) => s.conversations);

  return (
    <Dialog open={open} onOpenChange={setSettingsOpen} title="Settings">
      <Section title="Appearance">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3">
          <div>
            <p className="text-sm font-medium text-fg">Theme</p>
            <p className="text-xs text-faint">{theme === "dark" ? "Dark" : "Light"}</p>
          </div>
          <div className="flex rounded-md border border-border p-0.5">
            <ThemeButton
              active={theme === "light"}
              onClick={() => theme !== "light" && toggleTheme()}
              label="Light"
              icon={<Sun className="size-3.5" />}
            />
            <ThemeButton
              active={theme === "dark"}
              onClick={() => theme !== "dark" && toggleTheme()}
              label="Dark"
              icon={<Moon className="size-3.5" />}
            />
          </div>
        </div>
      </Section>

      <Section title="Data">
        <div className="rounded-lg border border-border px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-fg">Conversation history</p>
              <p className="mt-0.5 text-xs text-faint">
                {conversations.length === 0
                  ? "Nothing stored on this device"
                  : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"} on this device`}
              </p>
            </div>
            <button
              type="button"
              disabled={conversations.length === 0}
              onClick={() => {
                if (window.confirm("Clear all conversations? This cannot be undone.")) {
                  clearAll();
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                conversations.length === 0
                  ? "cursor-not-allowed text-faint opacity-40"
                  : "text-danger hover:bg-danger/10",
              )}
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          </div>
          <p className="mt-2 text-2xs leading-relaxed text-faint">
            Chats stay in this browser. Clearing removes them from this device only.
          </p>
        </div>
      </Section>

      <Section title="About">
        <div className="rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-medium text-fg">Nexvon</p>
          <p className="mt-1 text-xs leading-relaxed text-faint">
            A focused AI companion. Replies stream in real time and stay on your device.
          </p>
        </div>
      </Section>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-1">
      <h3 className="mb-2 text-2xs font-semibold tracking-wide text-faint uppercase">{title}</h3>
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
        "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "text-muted hover:text-fg",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
