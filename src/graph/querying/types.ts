import { Edge, Node } from "../ontology.js";
import { Message } from "../../llm/types.js";
import { z } from "zod";

export const QueryStrategySchema = z.enum([
  "basic",
  "local",
  "global",
  "drift",
  "bfs",
  "shortest_path",
]);
export type QueryStrategy = z.infer<typeof QueryStrategySchema>;

export const QueryPlanSchema = z.object({
  strategies: z.array(QueryStrategySchema).min(1),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

export type QueryMethod = QueryStrategy | "combined";

export type QueryTuningOptions = {
  /** Max ranked nodes/edges or BFS neighborhood size. */
  topK?: number;
  /** Max seed nodes selected by similarity for expansion strategies. */
  seedK?: number;
  /** Hop limit for BFS neighborhood expansion. */
  maxHops?: number;
};

export type QueryOptions = QueryTuningOptions & {
  method?: QueryMethod;
  /** Prior user/assistant turns for multi-turn queries. System messages are ignored. */
  history?: Message[];
};

export type QueryRunOptions = {
  graph?: QueryGraph;
  history?: Message[];
};

export function normalizeQueryRunOptions(options?: QueryGraph | QueryRunOptions): QueryRunOptions {
  if (!options) {
    return {};
  }

  if ("nodes" in options && "edges" in options) {
    return { graph: options };
  }

  return options;
}

export type Community = {
  id: string;
  summary: string;
  nodeIds: string[];
};

export type QueryGraph = {
  nodes: Node[];
  edges: Edge[];
  communities?: Community[];
};

export type QueryContext = {
  query: string;
  materials: string[];
};

export type QueryResult = QueryContext & {
  answer: string;
};
