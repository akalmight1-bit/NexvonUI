import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { BookOpen, Moon, Sun, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useChatStore } from "@/lib/chat/store";
import { getServiceStatus } from "@/lib/chat/stream";
import type { ServiceStatus } from "@/lib/chat/types";
import { cn, formatBytes } from "@/lib/utils";
import { ProviderSelect } from "./provider-select";

export function SettingsModal() {
  const open = useChatStore((s) => s.settingsOpen);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const theme = useChatStore((s) => s.theme);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const clearAll = useChatStore((s) => s.clearAll);
  const conversations = useChatStore((s) => s.conversations);
  const knowledge = useChatStore((s) => s.knowledge);
  const addKnowledge = useChatStore((s) => s.addKnowledge);
  const removeKnowledge = useChatStore((s) => s.removeKnowledge);
  const clearKnowledge = useChatStore((s) => s.clearKnowledge);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getServiceStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onKnowledgeFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files.slice(0, 8)) {
      if (file.size > 300 * 1024) continue;
      const text = await file.text();
      addKnowledge({
        name: file.name,
        mimeType: file.type || "text/plain",
        text,
        size: file.size,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSettingsOpen} title="Settings">
      <Section title="Connection">
        <div className="rounded-lg border border-border px-3.5 py-3">
          <StatusRow
            label="Chat"
            value={
              status?.backend.connected
                ? "Backend connected"
                : status?.providers.length
                  ? `${status.providers.length} local provider${status.providers.length === 1 ? "" : "s"}`
                  : "Offline"
            }
            ok={Boolean(status?.backend.connected || status?.providers.length)}
          />
          <StatusRow
            label="Search"
            value={
              status?.search.enabled
                ? status.search.engines.length
                  ? status.search.engines.join(" + ")
                  : "On (via backend)"
                : "Off — set BRAVE_API_KEY / SERPER_API_KEY"
            }
            ok={Boolean(status?.search.enabled)}
          />
          <StatusRow label="Files" value="Images and text, up to 6 per message" ok />
          <StatusRow
            label="Library"
            value={knowledge.length ? `${knowledge.length} document${knowledge.length === 1 ? "" : "s"}` : "Empty"}
            ok={knowledge.length > 0}
          />
        </div>
      </Section>

      <Section title="Model">
        <div className="rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-medium text-fg">Provider</p>
          <p className="mt-0.5 mb-2.5 text-xs text-faint">
            Auto tries every configured backend. Pin one if you want a single API.
          </p>
          <ProviderSelect />
        </div>
      </Section>

      <Section title="Knowledge library">
        <div className="rounded-lg border border-border px-3.5 py-3">
          <p className="text-sm font-medium text-fg">RAG</p>
          <p className="mt-0.5 text-xs leading-relaxed text-faint">
            Add notes or files. Nexvon retrieves the relevant passages on each turn and cites them.
          </p>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.py,.html,.css"
            onChange={(e) => void onKnowledgeFiles(e)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-fg hover:bg-fg/5"
          >
            <BookOpen className="size-3.5" />
            Add documents
          </button>
          {knowledge.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {knowledge.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-fg">{doc.name}</p>
                    <p className="text-2xs text-faint">
                      {doc.chunks.length} chunk{doc.chunks.length === 1 ? "" : "s"} · {formatBytes(doc.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${doc.name}`}
                    onClick={() => removeKnowledge(doc.id)}
                    className="grid size-9 place-items-center rounded-sm text-faint hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {knowledge.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear the knowledge library?")) clearKnowledge();
              }}
              className="mt-2 text-2xs text-faint hover:text-danger"
            >
              Clear library
            </button>
          ) : null}
        </div>
      </Section>

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
                "inline-flex h-11 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors",
                conversations.length === 0
                  ? "cursor-not-allowed text-faint opacity-40"
                  : "text-danger hover:bg-danger/10",
              )}
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          </div>
        </div>
      </Section>
    </Dialog>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-2xs text-faint">{value}</p>
      </div>
      <span
        className={cn("mt-1 size-2 shrink-0 rounded-full", ok ? "bg-fg" : "bg-faint/50")}
        aria-hidden
      />
    </div>
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
        "inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "text-muted hover:text-fg",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
