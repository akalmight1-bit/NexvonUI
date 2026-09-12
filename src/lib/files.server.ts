const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 300 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "yml",
  "yaml",
  "log",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "go",
  "rs",
  "rb",
  "php",
  "html",
  "css",
  "scss",
  "sh",
  "sql",
  "toml",
  "ini",
  "env",
  "conf",
]);

export type ProcessedFile = {
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "text" | "file";
  dataUrl?: string;
  textContent?: string;
};

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function isTextLike(name: string, mime: string) {
  if (mime.startsWith("text/")) return true;
  if (mime === "application/json" || mime === "application/xml") return true;
  return TEXT_EXTENSIONS.has(extOf(name));
}

function isImageLike(mime: string) {
  return /^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(mime);
}

export async function processUploadedFile(file: File): Promise<ProcessedFile> {
  const mime = file.type || "application/octet-stream";
  const base = { name: file.name, mimeType: mime, size: file.size };

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large (max 25MB)`);
  }

  if (isImageLike(mime)) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is too large for an image (max 8MB)`);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return { ...base, kind: "image", dataUrl };
  }

  if (isTextLike(file.name, mime) && file.size <= MAX_TEXT_BYTES) {
    const textContent = await file.text();
    return { ...base, kind: "text", textContent };
  }

  return { ...base, kind: "file" };
}

export async function processFormFiles(form: FormData): Promise<ProcessedFile[]> {
  const files = form
    .getAll("file")
    .concat(form.getAll("files"))
    .filter((v): v is File => typeof File !== "undefined" && v instanceof File);
  const out: ProcessedFile[] = [];
  for (const file of files.slice(0, 6)) {
    out.push(await processUploadedFile(file));
  }
  return out;
}
