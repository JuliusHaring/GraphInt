import { extname } from "node:path";

export const MIME_TYPES = {
  PLAIN_TEXT: "text/plain",
  HTML: "text/html",
  XHTML: "application/xhtml+xml",
  PDF: "application/pdf",
  DOC: "application/msword",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLS: "application/vnd.ms-excel",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".txt": MIME_TYPES.PLAIN_TEXT,
  ".md": MIME_TYPES.PLAIN_TEXT,
  ".html": MIME_TYPES.HTML,
  ".htm": MIME_TYPES.HTML,
  ".pdf": MIME_TYPES.PDF,
  ".doc": MIME_TYPES.DOC,
  ".docx": MIME_TYPES.DOCX,
  ".xls": MIME_TYPES.XLS,
  ".xlsx": MIME_TYPES.XLSX,
};

export function mimeTypeFromPath(filePath: string): string {
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported file extension: ${extname(filePath) || filePath}`);
  }
  return mimeType;
}

export function mimeTypeFromFile(file: File): string {
  if (file.type) {
    return file.type;
  }
  return mimeTypeFromPath(file.name);
}

export function parseContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function mimeTypeFromUrl(url: string): string {
  return mimeTypeFromPath(new URL(url).pathname);
}

export function mimeTypeFromResponse(url: string, contentType?: string): string {
  const fromHeader = contentType ? parseContentType(contentType) : undefined;
  if (fromHeader && fromHeader !== "application/octet-stream") {
    return fromHeader;
  }
  return mimeTypeFromUrl(url);
}
