import { readFile } from "node:fs/promises";
import { BaseLLMProvider } from "../../llm/base-llm-provider.js";
import { Ontology } from "../ontology.js";
import {
  defaultDocumentExtractorRegistry,
  DocumentExtractorRegistry,
} from "./document-extractors/registry.js";
import { mimeTypeFromFile, mimeTypeFromPath } from "./document-extractors/mime.js";
import { LLMExtractor } from "./llm-extractor.js";
import { IngestionResult } from "./types.js";

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

  async extractFromFile(file: File): Promise<IngestionResult> {
    const mimeType = mimeTypeFromFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await this.documentExtractors.extractText(mimeType, buffer);
    return this.llmExtractor.extract(text, this.ontology);
  }

  async extractFromPath(path: string): Promise<IngestionResult> {
    const mimeType = mimeTypeFromPath(path);
    const buffer = await readFile(path);
    const text = await this.documentExtractors.extractText(mimeType, buffer);
    return this.llmExtractor.extract(text, this.ontology);
  }
}
