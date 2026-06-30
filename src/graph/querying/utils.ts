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
  return expandNeighborhoodBfs(seedIds, edges, 1);
}

export function expandNeighborhoodBfs(
  seedIds: Set<string>,
  edges: Edge[],
  maxHops: number,
): { nodeIds: Set<string>; edges: Edge[] } {
  if (maxHops <= 0 || seedIds.size === 0) {
    return { nodeIds: new Set(seedIds), edges: [] };
  }

  const nodeIds = new Set(seedIds);
  const neighborhoodEdges = new Map<string, Edge>();
  const visited = new Set(seedIds);
  const queue: Array<{ id: string; depth: number }> = [...seedIds].map((id) => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxHops) {
      continue;
    }

    for (const edge of edges) {
      if (edge.from !== id && edge.to !== id) {
        continue;
      }

      neighborhoodEdges.set(edge.id, edge);
      const neighbor = edge.from === id ? edge.to : edge.from;
      nodeIds.add(edge.from);
      nodeIds.add(edge.to);

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  return { nodeIds, edges: [...neighborhoodEdges.values()] };
}

export type GraphPath = {
  nodeIds: string[];
  edges: Edge[];
};

export function shortestPath(startId: string, endId: string, edges: Edge[]): GraphPath | undefined {
  if (startId === endId) {
    return { nodeIds: [startId], edges: [] };
  }

  const visited = new Set<string>([startId]);
  const queue: Array<{ id: string; nodeIds: string[]; pathEdges: Edge[] }> = [
    { id: startId, nodeIds: [startId], pathEdges: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const edge of edges) {
      if (edge.from !== current.id && edge.to !== current.id) {
        continue;
      }

      const neighbor = edge.from === current.id ? edge.to : edge.from;
      if (visited.has(neighbor)) {
        continue;
      }

      const nodeIds = [...current.nodeIds, neighbor];
      const pathEdges = [...current.pathEdges, edge];

      if (neighbor === endId) {
        return { nodeIds, edges: pathEdges };
      }

      visited.add(neighbor);
      queue.push({ id: neighbor, nodeIds, pathEdges });
    }
  }

  return undefined;
}

export function formatPathDescription(nodesById: Map<string, Node>, path: GraphPath): string {
  const segments: string[] = [];

  for (let index = 0; index < path.edges.length; index++) {
    const node = nodesById.get(path.nodeIds[index]);
    if (node) {
      segments.push(formatNode(node));
    }
    segments.push(formatEdge(path.edges[index]));
  }

  const lastNode = nodesById.get(path.nodeIds[path.nodeIds.length - 1]);
  if (lastNode) {
    segments.push(formatNode(lastNode));
  }

  const hops = Math.max(0, path.nodeIds.length - 1);
  return `Path (${hops} hop${hops === 1 ? "" : "s"}): ${segments.join(" then ")}`;
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
