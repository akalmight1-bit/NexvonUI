import { useEffect, useRef, useState } from "react";
import { Menu, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat/store";
import { streamChat } from "@/lib/chat/stream";
import { Sidebar } from "./sidebar";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { Logo } from "./logo";
import { SettingsModal } from "./settings-modal";
import { IntroAnimation, useIntroGate } from "./intro-animation";

export function ChatApp() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const streaming = useChatStore((s) => s.streaming);
  const error = useChatStore((s) => s.error);
  const toast = useChatStore((s) => s.toast);
  const theme = useChatStore((s) => s.theme);
  const pushUser = useChatStore((s) => s.pushUser);
  const beginAssistant = useChatStore((s) => s.beginAssistant);
  const appendAssistant = useChatStore((s) => s.appendAssistant);
  const removeLastAssistant = useChatStore((s) => s.removeLastAssistant);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setError = useChatStore((s) => s.setError);
  const showToast = useChatStore((s) => s.showToast);
  const clearToast = useChatStore((s) => s.clearToast);
  const renameIfNeeded = useChatStore((s) => s.renameIfNeeded);
  const newChat = useChatStore((s) => s.newChat);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);

  const { showIntro, appVisible, handleComplete } = useIntroGate();

  const [draft, setDraft] = useState("");
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
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), 1800);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  // Global keyboard shortcuts
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

  // Focus composer when conversation is empty or switches (after intro)
  useEffect(() => {
    if (streaming || !appVisible) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("nexvon-input")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeId, streaming, appVisible]);

  async function runStream(
    conversationId: string,
    history: { role: "user" | "assistant"; content: string }[],
  ) {
    const assistantId = beginAssistant(conversationId);
    const ac = new AbortController();
    abortRef.current = ac;
    setStreaming(true);
    setError(null);
    let wrote = false;
    try {
      await streamChat(history, {
        signal: ac.signal,
        onDelta: (chunk) => {
          wrote = true;
          appendAssistant(conversationId, assistantId, chunk);
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Signal lost.";
      setError(msg);
      if (!wrote) {
        appendAssistant(
          conversationId,
          assistantId,
          `Could not reach Nexvon. ${msg}`,
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setDraft("");
    const { conversationId, messages: history } = pushUser(content);
    renameIfNeeded(conversationId, content);
    await runStream(
      conversationId,
      history.map((m) => ({ role: m.role, content: m.content })),
    );
  }

  async function regenerate() {
    if (!activeId || streaming) return;
    const history = removeLastAssistant(activeId);
    if (!history || history.length === 0) return;
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    await runStream(
      activeId,
      history.map((m) => ({ role: m.role, content: m.content })),
    );
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-void text-fg">
      {showIntro ? <IntroAnimation onComplete={handleComplete} /> : null}

      <div
        className="relative z-10 flex min-h-0 min-w-0 flex-1 transition-all duration-700"
        style={{
          opacity: appVisible ? 1 : 0,
          transform: appVisible ? "scale(1)" : "scale(0.97)",
          transitionTimingFunction: "cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}
      >
        <Sidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
            <div className="flex items-center gap-1">
              <Button
                variant="icon"
                className="md:hidden"
                aria-label="Open conversations"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="flex items-center gap-2 md:hidden">
                <Logo className="size-6 text-accent" />
                <div>
                  <span className="text-sm font-semibold leading-none">Nexvon</span>
                  <p className="text-[10px] tracking-wider text-faint uppercase">AI companion</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="icon"
                aria-label="New chat (⌘N)"
                title="New chat · ⌘N"
                onClick={newChat}
                disabled={streaming}
              >
                <Plus className="size-5" />
              </Button>
              <Button
                variant="icon"
                aria-label={theme === "light" ? "Switch to night" : "Switch to day"}
                onClick={toggleTheme}
              >
                <span className="relative grid size-5 place-items-center">
                  <Sun
                    className={`absolute size-5 transition-[opacity,transform,filter] duration-300 ${
                      theme === "light"
                        ? "scale-100 opacity-100 blur-0"
                        : "scale-[0.25] opacity-0 blur-[4px]"
                    }`}
                  />
                  <Moon
                    className={`size-5 transition-[opacity,transform,filter] duration-300 ${
                      theme === "dark"
                        ? "scale-100 opacity-100 blur-0"
                        : "scale-[0.25] opacity-0 blur-[4px]"
                    }`}
                  />
                </span>
              </Button>
            </div>
          </header>

          {messages.length === 0 ? (
            <EmptyState
              onPick={(s) => {
                setDraft(s);
                requestAnimationFrame(() => {
                  document.getElementById("nexvon-input")?.focus();
                });
              }}
            />
          ) : (
            <MessageList
              messages={messages}
              streaming={streaming}
              onRegenerate={regenerate}
              onCopied={() => showToast("Copied to clipboard")}
            />
          )}

          {error ? (
            <p className="px-6 pb-2 text-center text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Composer
            value={draft}
            onChange={setDraft}
            streaming={streaming}
            onSend={send}
            onStop={stop}
          />
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full nx-glass-strong px-4 py-2 text-xs font-medium text-fg shadow-lg"
          style={{ animation: "fadeUp 220ms var(--ease-out) both" }}
        >
          {toast}
        </div>
      ) : null}

      <SettingsModal />
    </div>
  );
}
