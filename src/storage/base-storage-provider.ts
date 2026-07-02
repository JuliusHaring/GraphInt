import { Node, Edge } from "./types.js";

/** Base options shared by all storage providers. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extended by provider-specific option types
export interface StorageProviderOptions {}

export type EdgeDirection = "in" | "out" | "both";

export abstract class BaseStorageProvider {
  constructor(protected readonly options: StorageProviderOptions = {}) {}

  abstract getNode(id: string): Promise<Node>;
  abstract getNodes(ids: string[]): Promise<Node[]>;
  abstract listNodes(): Promise<Node[]>;
  abstract createNode(node: Node): Promise<void>;
  abstract updateNode(node: Node): Promise<void>;
  abstract upsertNode(node: Node): Promise<void>;
  abstract getEdge(id: string): Promise<Edge>;
  abstract getEdges(ids: string[]): Promise<Edge[]>;
  abstract listEdges(): Promise<Edge[]>;
  abstract createEdge(edge: Edge): Promise<void>;
  abstract updateEdge(edge: Edge): Promise<void>;
  abstract upsertEdge(edge: Edge): Promise<void>;
  abstract deleteEdge(id: string): Promise<void>;

  async listEdgesForNode(nodeId: string, direction: EdgeDirection = "both"): Promise<Edge[]> {
    const edges = await this.listEdges();
    return edges.filter((edge) => {
      if (direction === "out") {
        return edge.from === nodeId;
      }
      if (direction === "in") {
        return edge.to === nodeId;
      }
      return edge.from === nodeId || edge.to === nodeId;
    });
  }

  /** Delete a node and all incident edges. */
  async deleteNode(id: string): Promise<void> {
    const edges = await this.listEdgesForNode(id);
    for (const edge of edges) {
      await this.deleteEdge(edge.id);
    }
    await this.deleteNodeRecord(id);
  }

  protected abstract deleteNodeRecord(id: string): Promise<void>;

  protected notFound(entity: "Node" | "Edge", id: string): Error {
    return new Error(`${entity} with id "${id}" not found`);
  }

  protected alreadyExists(entity: "Node" | "Edge", id: string): Error {
    return new Error(`${entity} with id "${id}" already exists`);
  }
}
