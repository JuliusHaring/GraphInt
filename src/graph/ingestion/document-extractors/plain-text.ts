import { DocumentBuffer, DocumentTextExtractor, toBuffer } from "./types.js";
import { MIME_TYPES } from "./mime.js";

export class PlainTextExtractor implements DocumentTextExtractor {
  readonly mimeTypes = [MIME_TYPES.PLAIN_TEXT] as const;

  async extract(data: DocumentBuffer): Promise<string> {
    return toBuffer(data).toString("utf8");
  }
}
