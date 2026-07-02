import { describe, expect, it } from "vitest";
import {
  mimeTypeFromResponse,
  mimeTypeFromUrl,
  parseContentType,
} from "./mime.js";

describe("mimeTypeFromUrl", () => {
  it("uses the URL pathname extension", () => {
    expect(mimeTypeFromUrl("https://example.com/files/report.pdf?token=abc")).toBe(
      "application/pdf",
    );
    expect(mimeTypeFromUrl("https://example.com/page.html")).toBe("text/html");
  });
});

describe("mimeTypeFromResponse", () => {
  it("prefers the response content type", () => {
    expect(
      mimeTypeFromResponse(
        "https://example.com/download",
        "application/pdf; charset=binary",
      ),
    ).toBe("application/pdf");
  });

  it("falls back to the URL extension", () => {
    expect(mimeTypeFromResponse("https://example.com/report.pdf", undefined)).toBe(
      "application/pdf",
    );
  });

  it("ignores application/octet-stream headers", () => {
    expect(
      mimeTypeFromResponse(
        "https://example.com/report.pdf",
        "application/octet-stream",
      ),
    ).toBe("application/pdf");
  });
});

describe("parseContentType", () => {
  it("strips parameters", () => {
    expect(parseContentType("text/plain; charset=utf-8")).toBe("text/plain");
  });
});
