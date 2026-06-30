import { BaseLLMProvider } from "../llm/base-llm-provider.js";
import { BaseStorageProvider } from "../storage/base-storage-provider.js";
import { Edge, Node, Ontology, OntologyRegistry, PropertyValue } from "./ontology.js";
import { LLMExtractor } from "./ingestion/llm-extractor.js";
import { TextExtractor } from "./ingestion/text-extractor.js";
import { IngestionResult } from "./ingestion/types.js";

export type GraphClientOptions = {
  storageProvider: BaseStorageProvider;
  llmProvider: BaseLLMProvider;
  ontology: Ontology;
};

export type CreateNodeInput = {
  id: string;
  type: string;
  properties: Record<string, PropertyValue>;
};

export type EditNodeInput = {
  type?: string;
  properties?: Record<string, PropertyValue>;
};

export type CreateEdgeInput = {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: Record<string, PropertyValue>;
};

export type EditEdgeInput = {
  type?: string;
  from?: string;
  to?: string;
  properties?: Record<string, PropertyValue>;
};

export class GraphClient {
  private readonly storageProvider: BaseStorageProvider;
  private readonly textExtractor: TextExtractor;
  private readonly llmExtractor: LLMExtractor;
  private readonly ontology: Ontology;
  private readonly ontologyRegistry: OntologyRegistry;

  constructor(private readonly options: GraphClientOptions) {
    this.storageProvider = options.storageProvider;
    this.ontology = options.ontology;
    this.ontologyRegistry = OntologyRegistry.parse(options.ontology);
    this.textExtractor = new TextExtractor(options.llmProvider, options.ontology);
    this.llmExtractor = new LLMExtractor(options.llmProvider);
  }

  async ingestFromPath(path: string): Promise<IngestionResult> {
    const result = await this.textExtractor.extractFromPath(path);
    await this.save(result);
    return result;
  }

  async ingestFromFile(file: File): Promise<IngestionResult> {
    const result = await this.textExtractor.extractFromFile(file);
    await this.save(result);
    return result;
  }

  async ingestFromText(text: string | string[]): Promise<IngestionResult> {
    const result = await this.llmExtractor.extract(text, this.ontology);
    await this.save(result);
    return result;
  }

  getNode(id: string): Promise<Node> {
    return this.storageProvider.getNode(id);
  }

  getEdge(id: string): Promise<Edge> {
    return this.storageProvider.getEdge(id);
  }

  async createNode(input: CreateNodeInput): Promise<Node> {
    const node = this.ontologyRegistry.parseNode(input);
    await this.storageProvider.createNode(node);
    return node;
  }

  async editNode(id: string, input: EditNodeInput): Promise<Node> {
    const existing = await this.storageProvider.getNode(id);
    const node = this.ontologyRegistry.parseNode({
      id,
      type: input.type ?? existing.type,
      properties: { ...existing.properties, ...input.properties },
    });
    await this.storageProvider.updateNode(node);
    return node;
  }

  async createEdge(input: CreateEdgeInput): Promise<Edge> {
    const edge = this.ontologyRegistry.parseEdge(
      input,
      await this.loadNodesById([input.from, input.to]),
    );
    await this.storageProvider.createEdge(edge);
    return edge;
  }

  async editEdge(id: string, input: EditEdgeInput): Promise<Edge> {
    const existing = await this.storageProvider.getEdge(id);
    const from = input.from ?? existing.from;
    const to = input.to ?? existing.to;
    const edge = this.ontologyRegistry.parseEdge(
      {
        id,
        type: input.type ?? existing.type,
        from,
        to,
        properties: { ...existing.properties, ...input.properties },
      },
      await this.loadNodesById([from, to]),
    );
    await this.storageProvider.updateEdge(edge);
    return edge;
  }

  deleteNode(id: string): Promise<void> {
    return this.storageProvider.deleteNode(id);
  }

  deleteEdge(id: string): Promise<void> {
    return this.storageProvider.deleteEdge(id);
  }

  private async save(result: IngestionResult): Promise<void> {
    for (const node of result.nodes) {
      await this.storageProvider.upsertNode(node);
    }
    for (const edge of result.edges) {
      await this.storageProvider.upsertEdge(edge);
    }
  }

  private async loadNodesById(ids: string[]): Promise<Map<string, Node>> {
    const nodes = await this.storageProvider.getNodes(ids);
    return new Map(nodes.map((node) => [node.id, node]));
  }
}
