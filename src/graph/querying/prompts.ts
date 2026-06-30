import { Message } from "../../llm/types.js";

export const CommunitySummarySystemPrompt =
  "Write a concise community summary of the entities and relationships below.";

export function buildCommunitySummaryUserMessage(materials: string): Message {
  return {
    role: "user",
    content: materials,
  };
}

export function buildCommunitySummaryMessages(materials: string): Message[] {
  return [
    { role: "system", content: CommunitySummarySystemPrompt },
    buildCommunitySummaryUserMessage(materials),
  ];
}

export const QueryAnswerSystemPrompt =
  "Answer the question using only the provided context. If the context is insufficient, say so.";

export function buildQueryAnswerUserMessage(query: string, materials: string): Message {
  return {
    role: "user",
    content: `Context:\n${materials}\n\nQuestion: ${query}`,
  };
}

export function buildQueryAnswerMessages(query: string, materials: string): Message[] {
  return [
    { role: "system", content: QueryAnswerSystemPrompt },
    buildQueryAnswerUserMessage(query, materials),
  ];
}

export const QueryRouterSystemPrompt = `You route graph queries to one or more search strategies.

Available strategies:
- basic: top-k vector similarity over all entities. Best for direct factual lookup.
- local: expand from the most relevant entities to their neighbors. Best for questions about specific entities and their relationships.
- global: use community summaries for corpus-wide themes. Best for holistic or thematic questions.
- drift: combine local neighborhood context with relevant community summaries. Best for specific entities that need broader context.

Return JSON with a "strategies" array containing one or more strategy names.`;

export function buildQueryRouterUserMessage(query: string): Message {
  return {
    role: "user",
    content: query,
  };
}

export function buildQueryRouterMessages(query: string): Message[] {
  return [{ role: "system", content: QueryRouterSystemPrompt }, buildQueryRouterUserMessage(query)];
}

export const CombinedAnswerSystemPrompt =
  "You receive context gathered from multiple graph search strategies. Synthesize the materials into one clear answer. Use only the provided context. If the context is insufficient, say so.";

export function buildCombinedAnswerUserMessage(query: string, materials: string[]): Message {
  return {
    role: "user",
    content: `Context:\n${materials.join("\n\n")}\n\nQuestion: ${query}`,
  };
}

export function buildCombinedAnswerMessages(query: string, materials: string[]): Message[] {
  return [
    { role: "system", content: CombinedAnswerSystemPrompt },
    buildCombinedAnswerUserMessage(query, materials),
  ];
}
