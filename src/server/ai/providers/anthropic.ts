import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import type { AiConfig } from "../config";
import type { AiProvider, ChatChunk, ChatRequest, StructuredRequest, StructuredResult } from "../types";

/** Map SDK and network failures to kinds the learner can understand. Details go to the server log only. */
export function mapProviderError(err: unknown, timedOut = false): AiError {
  if (err instanceof AiError) return err;
  if (timedOut || err instanceof Anthropic.APIConnectionTimeoutError) return new AiError("timeout");
  if (err instanceof Anthropic.APIUserAbortError) return new AiError("timeout", "aborted");
  if (err instanceof Anthropic.APIError) {
    console.error(`[ai] provider error ${err.status ?? "?"}: ${err.message.slice(0, 300)}`);
    if (err.status === 401 || err.status === 403) {
      console.error("[ai] The API key was rejected. Check ANTHROPIC_API_KEY.");
    }
    return new AiError("unavailable", `status ${err.status ?? "?"}`);
  }
  console.error("[ai] unexpected error:", err instanceof Error ? err.message : err);
  return new AiError("unavailable");
}

/** Abort after `ms`, and also when the caller's signal aborts. */
function deadline(ms: number, outer?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const onAbort = () => controller.abort();
  outer?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear() {
      clearTimeout(timer);
      outer?.removeEventListener("abort", onAbort);
    },
  };
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(private readonly config: AiConfig) {
    // SDK retries cover transient 429/5xx/connection errors; our own deadline caps the total wait.
    this.client = new Anthropic({ apiKey: config.apiKey ?? undefined, maxRetries: 2, timeout: config.timeoutMs });
  }

  isConfigured(): boolean {
    return this.config.provider === "anthropic" && !!this.config.apiKey;
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const d = deadline(this.config.timeoutMs, req.signal);
    try {
      const stream = this.client.messages.stream(
        {
          model: this.config.model,
          max_tokens: req.maxTokens,
          system: [
            { type: "text", text: req.stableSystem, cache_control: { type: "ephemeral" } },
            { type: "text", text: req.dynamicSystem },
          ],
          messages: req.messages,
        },
        { signal: d.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw new AiError("refused");
      yield {
        type: "usage",
        inputTokens:
          final.usage.input_tokens +
          (final.usage.cache_read_input_tokens ?? 0) +
          (final.usage.cache_creation_input_tokens ?? 0),
        outputTokens: final.usage.output_tokens,
      };
    } catch (err) {
      throw mapProviderError(err, d.timedOut());
    } finally {
      d.clear();
    }
  }

  async generateStructured<T>(req: StructuredRequest, schema: z.ZodType<T>): Promise<StructuredResult<T>> {
    const d = deadline(this.config.timeoutMs, req.signal);
    let message: Anthropic.Message;
    try {
      const format = zodOutputFormat(schema as never);
      message = await this.client.messages.create(
        {
          model: this.config.fastModel,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: [{ role: "user", content: req.prompt }],
          output_config: { format: { type: format.type, schema: format.schema } },
        },
        { signal: d.signal },
      );
    } catch (err) {
      throw mapProviderError(err, d.timedOut());
    } finally {
      d.clear();
    }
    if (message.stop_reason === "refusal") throw new AiError("refused");
    const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return { data: parseStructured(text, schema), usage };
  }
}

/** Model output is untrusted: it must be valid JSON and pass the schema, or it is rejected. */
export function parseStructured<T>(text: string, schema: z.ZodType<T>): T {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiError("invalid_output", "not JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) throw new AiError("invalid_output", result.error.issues[0]?.message);
  return result.data;
}
