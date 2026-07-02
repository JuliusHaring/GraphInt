import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TextExtractor } from "../src/graph/ingestion/text-extractor.js";
import { fetchUrl } from "../src/graph/ingestion/fetch-url.js";
import { defaultDocumentExtractorRegistry } from "../src/graph/ingestion/document-extractors/registry.js";
import { htmlToText } from "../src/graph/ingestion/document-extractors/html.js";
import { mimeTypeFromResponse } from "../src/graph/ingestion/document-extractors/mime.js";
import { BIBLE_PDF_URL } from "./setup/paths.js";
import { BaseLLMProvider } from "../src/llm/base-llm-provider.js";
import { Ontology } from "../src/graph/ontology.js";

const WEBSITE_URL = "https://juliusharing.com";

const ontology: Ontology = {
  nodeTypes: [{ id: "person", name: "Person", properties: { name: "string" } }],
  edgeTypes: [],
};

class StubLLMProvider extends BaseLLMProvider {
  constructor() {
    super({ apiKey: "test", model: "test" });
  }

  generate<T extends z.ZodType>(): Promise<z.infer<T>> {
    return Promise.resolve({ nodes: [], edges: [] } as z.infer<T>);
  }

  protected embedUncached(): Promise<number[][]> {
    return Promise.resolve([]);
  }
}

describe("URL ingestion integration", () => {
  it("downloads and extracts text from the CSB Pew Bible PDF URL", async () => {
    const { buffer, contentType } = await fetchUrl(BIBLE_PDF_URL);
    const mimeType = mimeTypeFromResponse(BIBLE_PDF_URL, contentType);

    expect(mimeType).toBe("application/pdf");
    expect(buffer.length).toBeGreaterThan(1_000_000);

    const text = await defaultDocumentExtractorRegistry.extractText(mimeType, buffer);
    expect(text.length).toBeGreaterThan(100_000);
    expect(text).toMatch(/Genesis|Bible/i);
  });

  it("downloads and extracts text from juliusharing.com", async () => {
    const { buffer, contentType } = await fetchUrl(WEBSITE_URL);
    const mimeType = mimeTypeFromResponse(WEBSITE_URL, contentType);

    expect(mimeType).toMatch(/html/);

    const text = htmlToText(buffer.toString("utf8"));
    expect(text.length).toBeGreaterThan(100);
    expect(text).toMatch(/Julius|Haring/i);
  });

  it("runs ingestFromFileURL end-to-end with a stub LLM", async () => {
    const extractor = new TextExtractor(new StubLLMProvider(), ontology);
    const result = await extractor.extractFromFileURL(BIBLE_PDF_URL, {
      chunkSize: 10_000_000,
    });

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  }, 180_000);

  it("runs ingestFromWebsiteURL end-to-end with a stub LLM", async () => {
    const extractor = new TextExtractor(new StubLLMProvider(), ontology);
    const result = await extractor.extractFromWebsiteURL(WEBSITE_URL);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
