import { BaseStorageProvider } from "./base-storage-provider.js";
import { Edge, Node } from "./types.js";

export class MemoryStorageProvider extends BaseStorageProvider {
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  async getNode(id: string): Promise<Node> {
    const node = this.nodes.find((node) => node.id === id);
    if (!node) {
      throw new Error(`Node with id "${id}" not found`);
    }
    return node;
  }

  getNodes(ids: string[]): Promise<Node[]> {
    return Promise.all(ids.map((id) => this.getNode(id)));
  }

  listNodes(): Promise<Node[]> {
    return Promise.resolve([...this.nodes]);
  }

  createNode(node: Node): Promise<void> {
    if (this.nodes.some((existing) => existing.id === node.id)) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }
    this.nodes.push(node);
    return Promise.resolve();
  }

  updateNode(node: Node): Promise<void> {
    const index = this.nodes.findIndex((existing) => existing.id === node.id);
    if (index === -1) {
      throw new Error(`Node with id "${node.id}" not found`);
    }
    this.nodes[index] = node;
    return Promise.resolve();
  }

  upsertNode(node: Node): Promise<void> {
    const index = this.nodes.findIndex((existing) => existing.id === node.id);
    if (index === -1) {
      this.nodes.push(node);
    } else {
      this.nodes[index] = node;
    }
    return Promise.resolve();
  }

  deleteNode(id: string): Promise<void> {
    this.nodes = this.nodes.filter((node) => node.id !== id);
    return Promise.resolve();
  }

  async getEdge(id: string): Promise<Edge> {
    const edge = this.edges.find((edge) => edge.id === id);
    if (!edge) {
      throw new Error(`Edge with id "${id}" not found`);
    }
    return edge;
  }

  getEdges(ids: string[]): Promise<Edge[]> {
    return Promise.all(ids.map((id) => this.getEdge(id)));
  }

  listEdges(): Promise<Edge[]> {
    return Promise.resolve([...this.edges]);
  }

  createEdge(edge: Edge): Promise<void> {
    if (this.edges.some((existing) => existing.id === edge.id)) {
      throw new Error(`Edge with id "${edge.id}" already exists`);
    }
    this.edges.push(edge);
    return Promise.resolve();
  }

  updateEdge(edge: Edge): Promise<void> {
    const index = this.edges.findIndex((existing) => existing.id === edge.id);
    if (index === -1) {
      throw new Error(`Edge with id "${edge.id}" not found`);
    }
    this.edges[index] = edge;
    return Promise.resolve();
  }

  upsertEdge(edge: Edge): Promise<void> {
    const index = this.edges.findIndex((existing) => existing.id === edge.id);
    if (index === -1) {
      this.edges.push(edge);
    } else {
      this.edges[index] = edge;
    }
    return Promise.resolve();
  }

  deleteEdge(id: string): Promise<void> {
    this.edges = this.edges.filter((edge) => edge.id !== id);
    return Promise.resolve();
  }
}
