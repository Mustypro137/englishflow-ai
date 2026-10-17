import "server-only";
import { AiError } from "@/lib/ai/errors";
import type { AiProvider, ChatChunk, StructuredResult } from "../types";

/** Used when no provider is configured: every call reports "not configured" instead of pretending. */
export class NullProvider implements AiProvider {
  readonly name = "none";

  isConfigured(): boolean {
    return false;
  }

  // eslint-disable-next-line require-yield
  async *chat(): AsyncIterable<ChatChunk> {
    throw new AiError("not_configured");
  }

  async generateStructured<T>(): Promise<StructuredResult<T>> {
    throw new AiError("not_configured");
  }
}
