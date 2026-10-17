import "server-only";
import { readAiConfig } from "./config";
import { AnthropicProvider } from "./providers/anthropic";
import { MockProvider } from "./providers/mock";
import { NullProvider } from "./providers/null";
import type { AiProvider } from "./types";

let override: AiProvider | null = null;
let cached: AiProvider | null = null;

/** The configured provider, or a NullProvider when AI isn't set up. */
export function getAiProvider(): AiProvider {
  if (override) return override;
  if (!cached) {
    const config = readAiConfig();
    cached =
      config.provider === "anthropic"
        ? new AnthropicProvider(config)
        : config.provider === "mock"
          ? new MockProvider()
          : new NullProvider();
  }
  return cached;
}

export function isAiConfigured(): boolean {
  return getAiProvider().isConfigured();
}

/** Tests only: replace the provider with a mock (pass null to restore). */
export function setAiProviderForTests(provider: AiProvider | null): void {
  override = provider;
}
