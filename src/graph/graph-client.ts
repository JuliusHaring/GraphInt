import { BaseStorageProvider } from "../storage/base-storage-provider.js";
import { BaseLLMProvider } from "../llm/base-llm-provider.js";
import { Ontology, OntologyRegistry } from "./ontology.js";

export type GraphClientOptions = {
  storageProvider: BaseStorageProvider;
  llmProvider: BaseLLMProvider;
  ontology: Ontology;
};

export class GraphClient {
  private readonly storageProvider: BaseStorageProvider;
  private readonly llmProvider: BaseLLMProvider;
  private readonly ontologyRegistry: OntologyRegistry;

  constructor(private readonly options: GraphClientOptions) {
    this.storageProvider = options.storageProvider;
    this.llmProvider = options.llmProvider;
    this.ontologyRegistry = new OntologyRegistry(options.ontology);
  }
}
