import { Message } from "./types.js";

export const SelfHealSystemPrompt =
  "When asked to return structured data, respond with valid JSON only. If validation errors are reported, fix every issue and return a corrected JSON response without markdown fences or explanation.";

export function buildSelfHealUserMessage(validationError: string, previousOutput: string): Message {
  return {
    role: "user",
    content: `Your previous response failed validation.

Validation errors:
${validationError}

Previous response:
${previousOutput}

Return a corrected JSON response that resolves every validation error.`,
  };
}
