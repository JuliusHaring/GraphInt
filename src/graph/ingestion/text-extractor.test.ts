import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TextExtractor } from "./text-extractor.js";
import { BaseLLMProvider } from "../../llm/base-llm-provider.js";
import { Ontology } from "../ontology.js";

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

describe("TextExtractor URL ingestion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts text from a file URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/plain; charset=utf-8" }),
        arrayBuffer: async () => Buffer.from("Alice works at Acme"),
      }),
    );

    const extractor = new TextExtractor(new StubLLMProvider(), ontology);
    const result = await extractor.extractFromFileURL("https://example.com/alice.txt");

    expect(result.nodes).toEqual([]);
    expect(fetch).toHaveBeenCalledWith("https://example.com/alice.txt");
  });

  it("extracts text from a website URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        arrayBuffer: async () => Buffer.from("<html><body><p>Bob works at Beta</p></body></html>"),
      }),
    );

    const extractor = new TextExtractor(new StubLLMProvider(), ontology);
    await extractor.extractFromWebsiteURL("https://example.com/about");

    expect(fetch).toHaveBeenCalledWith("https://example.com/about");
  });

  it("rejects non-html website URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/pdf" }),
        arrayBuffer: async () => Buffer.from("%PDF"),
      }),
    );

    const extractor = new TextExtractor(new StubLLMProvider(), ontology);
    await expect(extractor.extractFromWebsiteURL("https://example.com/file.pdf")).rejects.toThrow(
      "Use ingestFromFileURL",
    );
  });
});
