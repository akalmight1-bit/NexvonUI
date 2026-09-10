import { useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat/store";
import { cn } from "@/lib/utils";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Logo } from "./logo";

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function UserMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const email = user.primaryEmail ?? "Account";
  const label = user.displayName ?? email;
  const initials = (user.displayName ?? email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

  return (
    <div ref={rootRef} className="relative border-t border-border px-3 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
          "hover:bg-fg/6",
          open && "bg-fg/8",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-fg">
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{label}</span>
          {user.primaryEmail && user.displayName ? (
            <span className="block truncate text-[11px] text-faint">{user.primaryEmail}</span>
          ) : null}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-3 right-3 z-50 overflow-hidden rounded-xl border border-border bg-[var(--elevated)] shadow-xl"
          style={{ animation: "fadeUp 160ms var(--ease-out) both" }}
        >
          <div className="border-b border-border px-3.5 py-2.5">
            <p className="truncate text-xs text-faint">{email}</p>
          </div>

          <div className="py-1">
            <MenuItem
              icon={<Settings className="size-4" />}
              label="Settings"
              onClick={() => {
                setOpen(false);
                // Placeholder — wire to a settings route/modal later
                window.alert("Settings coming soon");
              }}
            />
            <MenuItem
              icon={<HelpCircle className="size-4" />}
              label="Help"
              onClick={() => {
                setOpen(false);
                window.alert("Help coming soon");
              }}
            />
            <MenuItem
              icon={<Sparkles className="size-4" />}
              label="Upgrade plan"
              onClick={() => {
                setOpen(false);
                window.alert("Upgrade plan coming soon");
              }}
            />
          </div>

          {authEnabled ? (
            <div className="border-t border-border py-1">
              <MenuItem
                icon={<LogOut className="size-4" />}
                label={signingOut ? "Signing out…" : "Sign Out"}
                danger
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void signOut().catch(() => setSigningOut(false));
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors",
        danger
          ? "text-danger hover:bg-danger/10"
          : "text-fg hover:bg-fg/6",
        disabled && "opacity-50",
      )}
    >
      <span className={cn("shrink-0", danger ? "text-danger" : "text-faint")}>{icon}</span>
      {label}
    </button>
  );
}

export function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const selectChat = useChatStore((s) => s.selectChat);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const newChat = useChatStore((s) => s.newChat);
  const clearAll = useChatStore((s) => s.clearAll);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const streaming = useChatStore((s) => s.streaming);

  const panel = (
    <aside
      className={cn(
        "nx-solid flex h-full w-sidebar shrink-0 flex-col border-r border-border",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl",
        "max-md:transition-transform max-md:duration-[250ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]",
        sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 text-fg">
          <Logo className="size-7 text-accent" />
          <div>
            <div className="text-sm font-semibold tracking-tight">Nexvon</div>
            <div className="text-[11px] tracking-[0.16em] text-faint uppercase">AI</div>
          </div>
        </div>
        <Button
          variant="icon"
          className="md:hidden size-11"
          aria-label="Close conversations"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="px-3 pb-3">
        <Button
          variant="primary"
          className="w-full rounded-md"
          onClick={newChat}
          disabled={streaming}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-sm text-faint">No conversations yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-sm px-1 transition-colors duration-200",
                      active ? "bg-fg/8" : "hover:bg-fg/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectChat(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
                    >
                      <MessageSquare
                        className={cn("size-4 shrink-0", active ? "text-accent" : "text-faint")}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            active ? "text-fg" : "text-muted",
                          )}
                        >
                          {c.title}
                        </span>
                        <span className="block text-[10px] text-faint">
                          {relativeTime(c.updatedAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${c.title}`}
                      onClick={() => deleteChat(c.id)}
                      className="grid size-10 shrink-0 place-items-center rounded-xs text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger max-md:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {conversations.length > 0 ? (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear all conversations? This cannot be undone.")) {
                clearAll();
              }
            }}
            className="w-full rounded-md px-3 py-2 text-left text-xs text-faint transition-colors hover:bg-fg/5 hover:text-danger"
          >
            Clear all history
          </button>
        </div>
      ) : null}

      <UserMenu />
    </aside>
  );

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close conversations"
          className="fixed inset-0 z-30 bg-void/50 md:hidden"
          style={{ animation: "overlayFade 200ms ease-out" }}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      {panel}
    </>
  );
}
