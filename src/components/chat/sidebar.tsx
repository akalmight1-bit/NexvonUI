import { useMemo, useState } from "react";
import {
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useChatStore } from "@/lib/chat/store";
import { cn, groupConversations, relativeTime } from "@/lib/utils";
import { Logo } from "./logo";

export function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const collapsed = useChatStore((s) => s.sidebarCollapsed);
  const selectChat = useChatStore((s) => s.selectChat);
  const deleteChat = useChatStore((s) => s.deleteChat);
  const newChat = useChatStore((s) => s.newChat);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const toggleCollapsed = useChatStore((s) => s.toggleCollapsed);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const streaming = useChatStore((s) => s.streaming);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const key = groupConversations(c.updatedAt);
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const panel = (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-elevated",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-sidebar max-md:shadow-[var(--shadow-soft)]",
        "max-md:transition-transform max-md:duration-[250ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]",
        sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        collapsed ? "md:w-rail" : "md:w-sidebar",
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 pt-4 pb-3", collapsed && "md:justify-center md:px-2")}>
        <div className={cn("flex min-w-0 flex-1 items-center gap-2.5 text-fg", collapsed && "md:hidden")}>
          <Logo className="size-6 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">Nexvon</div>
            <div className="text-2xs text-faint">AI companion</div>
          </div>
        </div>
        <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <Button
            variant="icon"
            size="icon"
            className="hidden size-9 md:grid"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </Tooltip>
        <Button
          variant="icon"
          size="icon"
          className="size-10 md:hidden"
          aria-label="Close conversations"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className={cn("px-3 pb-3", collapsed && "md:px-2")}>
        {collapsed ? (
          <Tooltip content="New chat" side="right">
            <Button
              variant="primary"
              size="icon"
              className="hidden size-10 w-full md:grid"
              onClick={newChat}
              disabled={streaming}
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </Button>
          </Tooltip>
        ) : (
          <Button variant="primary" className="w-full max-md:hidden" onClick={newChat} disabled={streaming}>
            <Plus className="size-4" />
            New chat
          </Button>
        )}
        <Button variant="primary" className="w-full md:hidden" onClick={newChat} disabled={streaming}>
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <div className={cn("px-3 pb-2", collapsed && "md:hidden")}>
        <label className="sr-only" htmlFor="nexvon-search">
          Search conversations
        </label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2.5">
          <Search className="size-3.5 shrink-0 text-faint" />
          <input
            id="nexvon-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-9 w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto px-2 pb-2", collapsed && "md:px-1.5")}>
        {filtered.length === 0 ? (
          <p className={cn("px-3 py-6 text-sm text-faint", collapsed && "md:hidden")}>
            {query ? "No matching chats." : "No conversations yet."}
          </p>
        ) : collapsed ? (
          <ul className="hidden flex-col items-center gap-1 md:flex">
            {filtered.slice(0, 12).map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <Tooltip content={c.title} side="right">
                    <button
                      type="button"
                      onClick={() => selectChat(c.id)}
                      className={cn(
                        "grid size-10 place-items-center rounded-md text-xs font-semibold transition-colors",
                        active ? "bg-fg/10 text-fg" : "text-muted hover:bg-fg/6 hover:text-fg",
                      )}
                      aria-label={c.title}
                    >
                      {c.title.slice(0, 1).toUpperCase()}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="px-3 pb-1 text-2xs font-semibold tracking-wide text-faint uppercase">
                  {label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((c) => {
                    const active = c.id === activeId;
                    return (
                      <li key={c.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-0.5 rounded-md px-1 transition-colors duration-150",
                            active ? "bg-fg/8" : "hover:bg-fg/5",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => selectChat(c.id)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
                          >
                            <MessageSquare
                              className={cn("size-4 shrink-0", active ? "text-fg" : "text-faint")}
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
                              <span className="block text-2xs text-faint">
                                {relativeTime(c.updatedAt)}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${c.title}`}
                            onClick={() => deleteChat(c.id)}
                            className="grid size-9 shrink-0 place-items-center rounded-sm text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger max-md:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn("border-t border-border p-2", collapsed && "md:flex md:justify-center")}>
        <Tooltip content="Settings" side={collapsed ? "right" : "top"}>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-fg/6 hover:text-fg",
              collapsed && "md:w-10 md:justify-center md:px-0",
            )}
          >
            <Settings className="size-4 shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Settings</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close conversations"
          className="fixed inset-0 z-30 bg-bg/50 md:hidden"
          style={{ animation: "overlayFade 200ms ease-out" }}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      {panel}
    </>
  );
}
