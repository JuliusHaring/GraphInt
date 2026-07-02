import { Node, Edge } from "./types.js";

export interface StorageProviderOptions {}

export abstract class BaseStorageProvider {
  constructor(protected readonly options: StorageProviderOptions = {}) {}

  abstract getNode(id: string): Promise<Node>;
  abstract getNodes(ids: string[]): Promise<Node[]>;
  abstract listNodes(): Promise<Node[]>;
  abstract createNode(node: Node): Promise<void>;
  abstract updateNode(node: Node): Promise<void>;
  abstract upsertNode(node: Node): Promise<void>;
  abstract deleteNode(id: string): Promise<void>;
  abstract getEdge(id: string): Promise<Edge>;
  abstract getEdges(ids: string[]): Promise<Edge[]>;
  abstract listEdges(): Promise<Edge[]>;
  abstract createEdge(edge: Edge): Promise<void>;
  abstract updateEdge(edge: Edge): Promise<void>;
  abstract upsertEdge(edge: Edge): Promise<void>;
  abstract deleteEdge(id: string): Promise<void>;

  protected notFound(entity: "Node" | "Edge", id: string): Error {
    return new Error(`${entity} with id "${id}" not found`);
  }

  protected alreadyExists(entity: "Node" | "Edge", id: string): Error {
    return new Error(`${entity} with id "${id}" already exists`);
  }
}
