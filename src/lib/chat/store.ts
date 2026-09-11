import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import type { Attachment, ChatMessage, Conversation } from "./types";

const SUGGESTIONS = [
  "How does gravitational lensing work?",
  "Help me think through a hard decision",
  "Write a short poem from the photon ring",
  "Explain Schwarzschild spacetime simply",
];

type ChatState = {
  conversations: Conversation[];
  activeId: string | null;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  theme: "dark" | "light";
  streaming: boolean;
  error: string | null;
  suggestions: string[];
  toast: string | null;
  preferredProvider: string;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPreferredProvider: (id: string) => void;
  toggleTheme: () => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  clearAll: () => void;
  active: () => Conversation | undefined;
  pushUser: (
    content: string,
    attachments?: Attachment[],
  ) => { conversationId: string; messages: ChatMessage[] };
  beginAssistant: (conversationId: string) => string;
  appendAssistant: (conversationId: string, messageId: string, chunk: string) => void;
  removeLastAssistant: (conversationId: string) => ChatMessage[] | null;
  setStreaming: (v: boolean) => void;
  setError: (msg: string | null) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  renameIfNeeded: (conversationId: string, firstUser: string) => void;
};

function emptyConversation(): Conversation {
  return {
    id: uid(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      sidebarOpen: false,
      settingsOpen: false,
      theme: "dark",
      streaming: false,
      error: null,
      toast: null,
      suggestions: SUGGESTIONS,
      preferredProvider: "auto",
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setPreferredProvider: (id) => set({ preferredProvider: id || "auto" }),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
          }
          return { theme };
        }),
      newChat: () => {
        const convo = emptyConversation();
        set((s) => ({
          conversations: [convo, ...s.conversations],
          activeId: convo.id,
          error: null,
          sidebarOpen: false,
        }));
      },
      selectChat: (id) => set({ activeId: id, sidebarOpen: false, error: null }),
      deleteChat: (id) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeId =
            s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId };
        }),
      renameChat: (id, title) => {
        const next = title.trim().slice(0, 80) || "New chat";
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title: next } : c)),
        }));
      },
      clearAll: () =>
        set({
          conversations: [],
          activeId: null,
          error: null,
          sidebarOpen: false,
        }),
      active: () => get().conversations.find((c) => c.id === get().activeId),
      pushUser: (content, attachments) => {
        const trimmed = content.trim();
        const files = (attachments ?? []).slice(0, 6);
        let { conversations, activeId } = get();
        let convo = conversations.find((c) => c.id === activeId);
        if (!convo) {
          convo = emptyConversation();
          conversations = [convo, ...conversations];
          activeId = convo.id;
        }
        const msg: ChatMessage = {
          id: uid(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
          attachments: files.length > 0 ? files : undefined,
        };
        const next: Conversation = {
          ...convo,
          messages: [...convo.messages, msg],
          updatedAt: Date.now(),
        };
        set({
          conversations: conversations.map((c) => (c.id === next.id ? next : c)),
          activeId: next.id,
          error: null,
        });
        return { conversationId: next.id, messages: next.messages };
      },
      beginAssistant: (conversationId) => {
        const id = uid();
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { id, role: "assistant" as const, content: "", createdAt: Date.now() },
                  ],
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }));
        return id;
      },
      appendAssistant: (conversationId, messageId, chunk) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content: m.content + chunk } : m,
                  ),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }));
      },
      removeLastAssistant: (conversationId) => {
        const convo = get().conversations.find((c) => c.id === conversationId);
        if (!convo || convo.messages.length === 0) return null;
        const last = convo.messages[convo.messages.length - 1];
        if (last.role !== "assistant") return null;
        const messages = convo.messages.slice(0, -1);
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages, updatedAt: Date.now() }
              : c,
          ),
        }));
        return messages;
      },
      setStreaming: (v) => set({ streaming: v }),
      setError: (msg) => set({ error: msg }),
      showToast: (msg) => set({ toast: msg }),
      clearToast: () => set({ toast: null }),
      renameIfNeeded: (conversationId, firstUser) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            if (c.title !== "New chat" && c.title !== "New orbit") return c;
            const title = firstUser.replace(/\s+/g, " ").slice(0, 42);
            return { ...c, title: title || c.title };
          }),
        }));
      },
    }),
    {
      name: "nexvon.chat.v1",
      partialize: (s) => ({
        conversations: s.conversations,
        activeId: s.activeId,
        theme: s.theme,
        preferredProvider: s.preferredProvider,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const theme = state.theme === "light" ? "light" : "dark";
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = theme;
        }
      },
    },
  ),
);
