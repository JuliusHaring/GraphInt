import { Content, GoogleGenerativeAI } from "@google/generative-ai";
import { BaseLLMProvider, LLMProviderOptions } from "./base-llm-provider.js";
import { generateWithSelfHeal } from "./self-heal.js";
import { Message } from "./types.js";
import { z } from "zod";

function toGeminiRequest(messages: Message[]): {
  systemInstruction?: string;
  contents: Content[];
} {
  const systemInstruction = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  if (contents.length === 0) {
    throw new Error("At least one non-system message is required");
  }

  return {
    systemInstruction: systemInstruction || undefined,
    contents,
  };
}

export class GeminiLLMProvider extends BaseLLMProvider {
  private readonly api: GoogleGenerativeAI;
  private readonly model: string;

  constructor(options: LLMProviderOptions) {
    super(options);
    this.model = options.model;
    this.api = new GoogleGenerativeAI(options.apiKey);
  }

  async generate(messages: Message[]): Promise<string>;
  async generate<T extends z.ZodType>(
    messages: Message[],
    selfHealAttempts: number | undefined,
    schema: T,
  ): Promise<z.infer<T>>;
  async generate<T extends z.ZodType>(
    messages: Message[],
    selfHealAttempts = 3,
    schema?: T,
  ): Promise<string | z.infer<T>> {
    if (schema) {
      return generateWithSelfHeal(messages, selfHealAttempts, schema, (conversation) =>
        this.requestCompletion(conversation, true),
      );
    }

    return this.requestCompletion(messages, false);
  }

  private async requestCompletion(messages: Message[], json: boolean): Promise<string> {
    const { systemInstruction, contents } = toGeminiRequest(messages);
    const model = this.api.getGenerativeModel({
      model: this.model,
      systemInstruction,
      generationConfig: json ? { responseMimeType: "application/json" } : undefined,
    });

    const response = await model.generateContent({ contents });
    const text = response.response.text();

    if (!text) {
      throw new Error("No content returned from Gemini");
    }

    return text;
  }
}
