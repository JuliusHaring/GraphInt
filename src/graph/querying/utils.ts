import { BaseLLMProvider } from "../../llm/base-llm-provider.js";
import { Edge, Node } from "../ontology.js";

export type ScoredItem = {
  id: string;
  text: string;
  score: number;
};

export function formatNode(node: Node): string {
  return `Node ${node.id} (${node.type}): ${JSON.stringify(node.properties)}`;
}

export function formatEdge(edge: Edge): string {
  return `Edge ${edge.id} (${edge.type}): ${edge.from} -> ${edge.to}, ${JSON.stringify(edge.properties)}`;
}

export function formatCommunity(id: string, summary: string): string {
  return `Community ${id}: ${summary}`;
}

export function topKBySimilarity(
  llmProvider: BaseLLMProvider,
  queryEmbedding: number[],
  items: Array<{ id: string; embedding?: number[]; text: string }>,
  topK: number,
): ScoredItem[] {
  return items
    .filter((item) => item.embedding && item.embedding.length > 0)
    .map((item) => ({
      id: item.id,
      text: item.text,
      score: llmProvider.computeSimilarity(queryEmbedding, item.embedding!, "cosine"),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

export function expandNeighborhood(
  seedIds: Set<string>,
  edges: Edge[],
): { nodeIds: Set<string>; edges: Edge[] } {
  const nodeIds = new Set(seedIds);
  const neighborhoodEdges = edges.filter((edge) => seedIds.has(edge.from) || seedIds.has(edge.to));

  for (const edge of neighborhoodEdges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  return { nodeIds, edges: neighborhoodEdges };
}

export function nodeSearchItems(nodes: Node[]) {
  return nodes.map((node) => ({
    id: node.id,
    embedding: node.embedding,
    text: formatNode(node),
  }));
}

export function edgeSearchItems(edges: Edge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    embedding: edge.embedding,
    text: formatEdge(edge),
  }));
}

export function buildGraphSignature(nodes: Node[], edges: Edge[]): string {
  const nodeIds = nodes
    .map((node) => node.id)
    .sort()
    .join(",");
  const edgeIds = edges
    .map((edge) => edge.id)
    .sort()
    .join(",");
  return `${nodeIds}|${edgeIds}`;
}

export function detectCommunities(
  nodes: Node[],
  edges: Edge[],
): Array<{ id: string; nodeIds: string[] }> {
  const parent = new Map<string, string>();

  for (const node of nodes) {
    parent.set(node.id, node.id);
  }

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }

    let current = id;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }

    return root;
  };

  const union = (left: string, right: string): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      parent.set(leftRoot, rightRoot);
    }
  };

  for (const edge of edges) {
    if (parent.has(edge.from) && parent.has(edge.to)) {
      union(edge.from, edge.to);
    }
  }

  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const root = find(node.id);
    const group = groups.get(root) ?? [];
    group.push(node.id);
    groups.set(root, group);
  }

  return [...groups.values()].map((nodeIds, index) => ({
    id: `community-${index + 1}`,
    nodeIds,
  }));
}
