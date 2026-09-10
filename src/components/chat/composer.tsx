import {
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowUp, File as FileIcon, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";
import { cn, uid } from "@/lib/utils";
import type { Attachment } from "@/lib/chat/types";

const MAX_ATTACHMENTS = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_TEXT_READ_BYTES = 300 * 1024; // 300KB inlined as text
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB hard ceiling for anything

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "xml", "yml", "yaml", "log", "js", "jsx", "ts", "tsx",
  "py", "java", "c", "cpp", "h", "go", "rs", "rb", "php", "html", "css", "scss", "sh",
  "sql", "toml", "ini", "env", "conf",
]);

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function isTextLike(file: File) {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json" || file.type === "application/xml") return true;
  if (!file.type && TEXT_EXTENSIONS.has(extOf(file.name))) return true;
  return TEXT_EXTENSIONS.has(extOf(file.name));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsText(file);
  });
}

async function fileToAttachment(file: File): Promise<Attachment | null> {
  if (file.size > MAX_FILE_BYTES) {
    toast(`${file.name} is too large (max ${formatBytes(MAX_FILE_BYTES)})`);
    return null;
  }

  const isImage = file.type.startsWith("image/");
  const base = { id: uid(), name: file.name, mimeType: file.type || "application/octet-stream", size: file.size };

  if (isImage) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast(`${file.name} is too large for an image (max ${formatBytes(MAX_IMAGE_BYTES)})`);
      return null;
    }
    const dataUrl = await readAsDataUrl(file);
    return { ...base, kind: "image", dataUrl };
  }

  if (isTextLike(file) && file.size <= MAX_TEXT_READ_BYTES) {
    const textContent = await readAsText(file);
    return { ...base, kind: "text", textContent };
  }

  return { ...base, kind: "file" };
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pl-1.5 pr-7 text-xs">
      {attachment.kind === "image" && attachment.dataUrl ? (
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="size-8 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-elevated text-faint">
          <FileIcon className="size-4" />
        </span>
      )}
      <div className="min-w-0 max-w-[9rem]">
        <p className="truncate font-medium text-fg">{attachment.name}</p>
        <p className="text-2xs text-faint">
          {attachment.kind === "file" ? "Attached" : formatBytes(attachment.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="absolute right-1 top-1 grid size-5 place-items-center rounded-full text-faint transition-colors hover:bg-fg/10 hover:text-fg"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export function Composer({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  value: string;
  onChange: (v: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  disabled?: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [value]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      toast(`You can attach up to ${MAX_ATTACHMENTS} files per message`);
      return;
    }
    const accepted = list.slice(0, room);
    if (list.length > accepted.length) {
      toast(`Only the first ${room} file${room === 1 ? "" : "s"} were added`);
    }
    const results = await Promise.all(accepted.map(fileToAttachment));
    const next = results.filter((a): a is Attachment => a !== null);
    if (next.length > 0) onAttachmentsChange([...attachments, ...next]);
  }

  function removeAttachment(id: string) {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  }

  function submit() {
    const text = value.trim();
    if ((!text && attachments.length === 0) || disabled || streaming) return;
    onSend(text);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
  }

  const canSend = (Boolean(value.trim()) || attachments.length > 0) && !disabled;

  return (
    <form onSubmit={onSubmit} className="nx-composer-wrap mx-auto w-full max-w-2xl px-4 sm:px-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col gap-2 rounded-xl border border-border bg-elevated p-2 shadow-[var(--shadow-border)]",
          "transition-[box-shadow] duration-150",
          "focus-within:shadow-[0_0_0_1px_color-mix(in_oklab,var(--fg)_22%,transparent)]",
          dragOver && "shadow-[0_0_0_1.5px_var(--accent)]",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 px-1 pt-1">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Add files or images"
            title="Add files or images"
            className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-fg/8 hover:text-fg disabled:pointer-events-none disabled:opacity-40"
          >
            <Paperclip className="size-4.5" />
          </button>

          <label className="sr-only" htmlFor="nexvon-input">
            Message Nexvon
          </label>
          <textarea
            id="nexvon-input"
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKey}
            onPaste={onPaste}
            placeholder="Message Nexvon"
            className="min-h-10 max-h-40 flex-1 bg-transparent px-1 py-2.5 text-base leading-relaxed text-fg placeholder:text-faint sm:text-sm"
            autoComplete="off"
            spellCheck
          />
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop · Esc"
              className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-fg text-bg transition-transform duration-150 active:scale-[0.96]"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className={cn(
                "mb-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg transition-[transform,opacity] duration-150 active:scale-[0.96]",
                !canSend && "opacity-30",
              )}
            >
              <ArrowUp className="size-4" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2.5 hidden text-center text-2xs text-faint sm:block">
        Enter to send · Shift+Enter for a new line · drag files in or paste an image
      </p>
    </form>
  );
}
