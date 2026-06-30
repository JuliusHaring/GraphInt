export type DocumentBuffer = Buffer | Uint8Array;

export interface DocumentTextExtractor {
  readonly mimeTypes: readonly string[];
  extract(data: DocumentBuffer): Promise<string>;
}

export function toBuffer(data: DocumentBuffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}
