import { useEffect, useRef, useState } from "react";
import { Menu, Moon, Plus, Sun } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { useChatStore } from "@/lib/chat/store";
import { streamChat } from "@/lib/chat/stream";
import type { Attachment, ChatMessage } from "@/lib/chat/types";
import { Sidebar } from "./sidebar";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { Logo } from "./logo";
import { SettingsModal } from "./settings-modal";
import { ProviderSelect } from "./provider-select";

export function ChatApp() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const streaming = useChatStore((s) => s.streaming);
  const error = useChatStore((s) => s.error);
  const theme = useChatStore((s) => s.theme);
  const preferredProvider = useChatStore((s) => s.preferredProvider);
  const knowledge = useChatStore((s) => s.knowledge);
  const pushUser = useChatStore((s) => s.pushUser);
  const beginAssistant = useChatStore((s) => s.beginAssistant);
  const appendAssistant = useChatStore((s) => s.appendAssistant);
  const removeLastAssistant = useChatStore((s) => s.removeLastAssistant);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setError = useChatStore((s) => s.setError);
  const renameIfNeeded = useChatStore((s) => s.renameIfNeeded);
  const renameChat = useChatStore((s) => s.renameChat);
  const newChat = useChatStore((s) => s.newChat);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const active = conversations.find((c) => c.id === activeId);
  const messages = active?.messages ?? [];

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }, [theme]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (!streaming) newChat();
        return;
      }
      if (e.key === "Escape" && streaming) {
        e.preventDefault();
        abortRef.current?.abort();
        setStreaming(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [streaming, newChat, setStreaming]);

  useEffect(() => {
    if (streaming) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("nexvon-input")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeId, streaming]);

  async function runStream(conversationId: string, history: ChatMessage[]) {
    const assistantId = beginAssistant(conversationId);
    const ac = new AbortController();
    abortRef.current = ac;
    setStreaming(true);
    setError(null);
    let wrote = false;
    try {
      await streamChat(history, {
        signal: ac.signal,
        provider: preferredProvider,
        knowledge,
        onDelta: (chunk) => {
          wrote = true;
          appendAssistant(conversationId, assistantId, chunk);
        },
        onStatus: (status) => toast(status),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Couldn't reach Nexvon.";
      setError(msg);
      if (!wrote) {
        appendAssistant(conversationId, assistantId, `Couldn't reach Nexvon. ${msg}`);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if ((!content && attachments.length === 0) || streaming) return;
    setDraft("");
    const sentAttachments = attachments;
    setAttachments([]);
    const { conversationId, messages: history } = pushUser(content, sentAttachments);
    renameIfNeeded(conversationId, content || sentAttachments[0]?.name || "New chat");
    await runStream(conversationId, history);
  }

  async function regenerate() {
    if (!activeId || streaming) return;
    const history = removeLastAssistant(activeId);
    if (!history || history.length === 0) return;
    await runStream(activeId, history);
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  return (
    <TooltipProvider>
      <div className="relative flex h-full overflow-hidden bg-bg text-fg">
        <Sidebar />

        <div className="nx-canvas relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="icon"
                size="icon"
                className="md:hidden"
                aria-label="Open conversations"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="flex min-w-0 items-center gap-2 md:hidden">
                <Logo className="size-5" />
                <span className="text-sm font-semibold">Nexvon</span>
              </div>
              {active && messages.length > 0 ? (
                <div className="hidden min-w-0 md:block">
                  {editingTitle ? (
                    <input
                      autoFocus
                      defaultValue={active.title}
                      className="w-full max-w-xs rounded-sm bg-transparent px-1.5 py-1 text-sm font-medium text-fg outline-none ring-1 ring-border"
                      onBlur={(e) => {
                        renameChat(active.id, e.target.value);
                        setEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingTitle(true)}
                      className="truncate rounded-sm px-1.5 py-1 text-sm font-medium text-fg hover:bg-fg/5"
                      title="Rename"
                    >
                      {active.title}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <ProviderSelect compact className="hidden sm:block" />
              <Tooltip content="New chat · ⌘N">
                <Button
                  variant="icon"
                  size="icon"
                  aria-label="New chat"
                  onClick={newChat}
                  disabled={streaming}
                >
                  <Plus className="size-5" />
                </Button>
              </Tooltip>
              <Tooltip content={theme === "light" ? "Switch to dark" : "Switch to light"}>
                <Button
                  variant="icon"
                  size="icon"
                  aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
                  onClick={toggleTheme}
                >
                  <span className="relative grid size-5 place-items-center">
                    <Sun
                      className={`absolute size-5 transition-[opacity,transform,filter] duration-300 ${
                        theme === "light" ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
                      }`}
                    />
                    <Moon
                      className={`size-5 transition-[opacity,transform,filter] duration-300 ${
                        theme === "dark" ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
                      }`}
                    />
                  </span>
                </Button>
              </Tooltip>
            </div>
          </header>

          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 py-6">
                <EmptyState
                  onPick={(s) => {
                    setDraft(s);
                    requestAnimationFrame(() => {
                      document.getElementById("nexvon-input")?.focus();
                    });
                  }}
                />
                {error ? (
                  <p className="px-6 text-center text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <Composer
                  value={draft}
                  onChange={setDraft}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  streaming={streaming}
                  onSend={send}
                  onStop={stop}
                />
              </div>
            </div>
          ) : (
            <>
              <MessageList
                messages={messages}
                streaming={streaming}
                onRegenerate={regenerate}
                onCopied={() => toast("Copied")}
              />
              {error ? (
                <p className="px-6 pb-2 text-center text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="nx-composer-fade pt-4">
                <Composer
                  value={draft}
                  onChange={setDraft}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  streaming={streaming}
                  onSend={send}
                  onStop={stop}
                />
              </div>
            </>
          )}
        </div>

        <SettingsModal />
        <Toaster
          theme={theme}
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: "bg-elevated text-fg border-border shadow-[var(--shadow-border)]",
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}
