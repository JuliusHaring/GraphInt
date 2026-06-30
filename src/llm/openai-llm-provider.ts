import OpenAI from "openai";
import { BaseLLMProvider, LLMProviderOptions } from "./base-llm-provider.js";
import { generateWithSelfHeal } from "./self-heal.js";
import { Message } from "./types.js";
import { z } from "zod";

export class OpenAILLMProvider extends BaseLLMProvider {
  private readonly api: OpenAI;
  private readonly model: string;
  private readonly embeddingModel?: string;

  constructor(options: LLMProviderOptions) {
    super(options);
    this.model = options.model;
    this.api = new OpenAI({
      apiKey: options.apiKey,
    });
    this.embeddingModel = options.embeddingModel;
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
    const response = await this.api.chat.completions.create({
      model: this.model,
      messages,
      response_format: json ? { type: "json_object" } : undefined,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    return content;
  }

  protected async embedUncached(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.embeddingModel) {
      throw new Error("Embedding model not configured");
    }

    const response = await this.api.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });

    return response.data
      .sort((left, right) => left.index - right.index)
      .map((entry) => entry.embedding);
  }
}
