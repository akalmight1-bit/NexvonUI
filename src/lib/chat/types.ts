export type Role = "user" | "assistant";

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "text" | "file";
  dataUrl?: string;
  textContent?: string;
};

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: Attachment[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type Suggestion = {
  id: string;
  title: string;
  hint: string;
  prompt: string;
};

export type KnowledgeDoc = {
  id: string;
  name: string;
  mimeType: string;
  text: string;
  chunks: string[];
  createdAt: number;
  size: number;
};

export type ServiceStatus = {
  providers: { id: string; label: string; model: string }[];
  search: { enabled: boolean; engines: string[] };
  files: boolean;
  rag: boolean;
  backend: { configured: boolean; connected: boolean };
};
