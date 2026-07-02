import { describe, expect, it } from "vitest";
import { htmlToText, isHtmlContentType } from "./html.js";

describe("htmlToText", () => {
  it("strips tags and preserves readable text", () => {
    const text = htmlToText(`
      <html>
        <head><title>Ignored</title><style>body { color: red; }</style></head>
        <body>
          <h1>Hello</h1>
          <p>World &amp; friends</p>
          <script>alert("nope")</script>
        </body>
      </html>
    `);

    expect(text).toContain("Hello");
    expect(text).toContain("World & friends");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color: red");
  });

  it("decodes numeric entities", () => {
    expect(htmlToText("<p>&#65;&#x42;</p>")).toBe("AB");
  });
});

describe("isHtmlContentType", () => {
  it("accepts html mime types", () => {
    expect(isHtmlContentType("text/html")).toBe(true);
    expect(isHtmlContentType("application/xhtml+xml")).toBe(true);
    expect(isHtmlContentType("application/pdf")).toBe(false);
  });
});
