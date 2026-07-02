import { readFile } from "node:fs/promises";
import { BaseLLMProvider } from "../../llm/base-llm-provider.js";
import { Ontology } from "../ontology.js";
import {
  defaultDocumentExtractorRegistry,
  DocumentExtractorRegistry,
} from "./document-extractors/registry.js";
import { isHtmlContentType } from "./document-extractors/html.js";
import {
  mimeTypeFromFile,
  mimeTypeFromPath,
  mimeTypeFromResponse,
} from "./document-extractors/mime.js";
import { fetchUrl } from "./fetch-url.js";
import { IngestionOptions, resolveIngestionInput } from "./chunking.js";
import { LLMExtractor } from "./llm-extractor.js";
import { IngestionResult } from "./types.js";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("TextExtractor");

export class TextExtractor {
  private readonly llmExtractor: LLMExtractor;
  private readonly documentExtractors: DocumentExtractorRegistry;

  constructor(
    private readonly llmProvider: BaseLLMProvider,
    private readonly ontology: Ontology,
    documentExtractors: DocumentExtractorRegistry = defaultDocumentExtractorRegistry,
  ) {
    this.llmExtractor = new LLMExtractor(llmProvider);
    this.documentExtractors = documentExtractors;
  }

  async extractFromFile(file: File, options?: IngestionOptions): Promise<IngestionResult> {
    const mimeType = mimeTypeFromFile(file);
    log.info("Extracting text from file", { name: file.name, mimeType });
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await this.documentExtractors.extractText(mimeType, buffer);
    return this.extractText(text, options);
  }

  async extractFromPath(path: string, options?: IngestionOptions): Promise<IngestionResult> {
    const mimeType = mimeTypeFromPath(path);
    log.info("Extracting text from path", { path, mimeType });
    const buffer = await readFile(path);
    const text = await this.documentExtractors.extractText(mimeType, buffer);
    return this.extractText(text, options);
  }

  async extractFromFileURL(url: string, options?: IngestionOptions): Promise<IngestionResult> {
    const { buffer, contentType } = await fetchUrl(url);
    const mimeType = mimeTypeFromResponse(url, contentType);
    log.info("Extracting text from file URL", { url, mimeType });
    const text = await this.documentExtractors.extractText(mimeType, buffer);
    return this.extractText(text, options);
  }

  async extractFromWebsiteURL(url: string, options?: IngestionOptions): Promise<IngestionResult> {
    const { buffer, contentType } = await fetchUrl(url);
    const mimeType = contentType ? mimeTypeFromResponse(url, contentType) : undefined;
    if (mimeType && !isHtmlContentType(mimeType)) {
      throw new Error(
        `Expected HTML content from ${url}, got "${mimeType}". Use ingestFromFileURL for file URLs.`,
      );
    }

    log.info("Extracting text from website URL", { url, mimeType });
    const text = await this.documentExtractors.extractText(mimeType ?? "text/html", buffer);
    return this.extractText(text, options);
  }

  private async extractText(text: string, options?: IngestionOptions): Promise<IngestionResult> {
    const chunks = resolveIngestionInput(text, options);
    log.info("Prepared ingestion chunks", { chunks: chunks.length });
    return this.llmExtractor.extract(chunks, this.ontology);
  }
}
