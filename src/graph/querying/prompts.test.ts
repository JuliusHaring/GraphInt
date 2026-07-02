import { describe, expect, it } from "vitest";
import {
  buildCombinedAnswerMessages,
  buildQueryAnswerMessages,
  buildQueryRouterMessages,
  normalizeQueryHistory,
} from "./prompts.js";

describe("query prompts", () => {
  const history = [
    { role: "user" as const, content: "Who works at Acme?" },
    { role: "assistant" as const, content: "Alice works at Acme." },
    { role: "system" as const, content: "ignored system prompt" },
  ];

  it("filters system messages from history", () => {
    expect(normalizeQueryHistory(history)).toEqual([
      { role: "user", content: "Who works at Acme?" },
      { role: "assistant", content: "Alice works at Acme." },
    ]);
  });

  it("inserts history before the current question in answer prompts", () => {
    const messages = buildQueryAnswerMessages("What is her title?", "Context material", history);

    expect(messages).toEqual([
      expect.objectContaining({ role: "system" }),
      { role: "user", content: "Who works at Acme?" },
      { role: "assistant", content: "Alice works at Acme." },
      {
        role: "user",
        content: "Context:\nContext material\n\nQuestion: What is her title?",
      },
    ]);
  });

  it("inserts history before the router question", () => {
    const messages = buildQueryRouterMessages("Tell me more about her", history);

    expect(messages.at(-1)).toEqual({
      role: "user",
      content: "Tell me more about her",
    });
    expect(messages).toHaveLength(4);
  });

  it("inserts history before combined answer prompts", () => {
    const messages = buildCombinedAnswerMessages(
      "What is her title?",
      ["Material A", "Material B"],
      history,
    );

    expect(messages.at(-1)?.content).toContain("Question: What is her title?");
    expect(messages).toHaveLength(4);
  });
});
