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
