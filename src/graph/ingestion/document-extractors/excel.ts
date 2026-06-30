import * as XLSX from "xlsx";
import { DocumentBuffer, DocumentTextExtractor, toBuffer } from "./types.js";
import { MIME_TYPES } from "./mime.js";

export class ExcelExtractor implements DocumentTextExtractor {
  readonly mimeTypes = [MIME_TYPES.XLS, MIME_TYPES.XLSX] as const;

  async extract(data: DocumentBuffer): Promise<string> {
    const workbook = XLSX.read(toBuffer(data), { type: "buffer" });

    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        return "";
      }

      return [`# ${sheetName}`, XLSX.utils.sheet_to_csv(sheet)].join("\n");
    })
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }
}
