import { Node, Edge } from "./types.js";

export abstract class BaseStorageProvider {
  abstract getNode(id: string): Promise<Node>;
  abstract getNodes(ids: string[]): Promise<Node[]>;
  abstract upsertNode(node: Node): Promise<void>;
  abstract deleteNode(id: string): Promise<void>;
  abstract getEdge(id: string): Promise<Edge>;
  abstract getEdges(ids: string[]): Promise<Edge[]>;
  abstract upsertEdge(edge: Edge): Promise<void>;
  abstract deleteEdge(id: string): Promise<void>;
}
