import { PDFParse } from "pdf-parse";
import { DocumentBuffer, DocumentTextExtractor, toBuffer } from "./types.js";
import { MIME_TYPES } from "./mime.js";

export class PdfExtractor implements DocumentTextExtractor {
  readonly mimeTypes = [MIME_TYPES.PDF] as const;

  async extract(data: DocumentBuffer): Promise<string> {
    const parser = new PDFParse({ data: toBuffer(data) });

    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }
}
