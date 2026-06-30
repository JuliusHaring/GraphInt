import mammoth from "mammoth";
import { DocumentBuffer, DocumentTextExtractor, toBuffer } from "./types.js";
import { MIME_TYPES } from "./mime.js";

export class DocxExtractor implements DocumentTextExtractor {
  readonly mimeTypes = [MIME_TYPES.DOCX] as const;

  async extract(data: DocumentBuffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: toBuffer(data) });
    return result.value.trim();
  }
}
