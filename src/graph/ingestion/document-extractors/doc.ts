import WordExtractor from "word-extractor";
import { DocumentBuffer, DocumentTextExtractor, toBuffer } from "./types.js";
import { MIME_TYPES } from "./mime.js";

export class DocExtractor implements DocumentTextExtractor {
  readonly mimeTypes = [MIME_TYPES.DOC] as const;

  async extract(data: DocumentBuffer): Promise<string> {
    const document = await new WordExtractor().extract(toBuffer(data));
    return document.getBody().trim();
  }
}
