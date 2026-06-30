import { Message } from "./types.js";
import { z } from "zod";

export type LLMProviderOptions = {
  apiKey: string;
  model: string;
  embeddingModel?: string;
};

export abstract class BaseLLMProvider {
  constructor(private readonly options: LLMProviderOptions) {}

  abstract generate(messages: Message[]): Promise<string>;
  abstract generate<T extends z.ZodType>(
    messages: Message[],
    selfHealAttempts: number | undefined,
    schema: T,
  ): Promise<z.infer<T>>;
}
