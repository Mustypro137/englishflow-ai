import "server-only";
import type { z } from "zod";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatRequest {
  /** Same for every learner and request, so the provider can cache it. */
  stableSystem: string;
  /** Learner- and request-specific instructions (level, style, context). */
  dynamicSystem: string;
  messages: ChatTurn[];
  maxTokens: number;
  signal?: AbortSignal;
}

export type ChatChunk = { type: "text"; text: string } | ({ type: "usage" } & TokenUsage);

export interface StructuredRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  signal?: AbortSignal;
}

export interface StructuredResult<T> {
  data: T;
  usage: TokenUsage;
}

/**
 * Server-side AI provider. Implementations throw AiError (from @/lib/ai/errors)
 * with a kind the UI can explain; they never return unvalidated structured data.
 */
export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  chat(req: ChatRequest): AsyncIterable<ChatChunk>;
  generateStructured<T>(req: StructuredRequest, schema: z.ZodType<T>): Promise<StructuredResult<T>>;
}
