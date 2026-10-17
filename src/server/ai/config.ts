import "server-only";

/** AI settings read from the server environment. The key never leaves the server. */
export interface AiConfig {
  provider: "anthropic" | null;
  apiKey: string | null;
  /** Tutor conversations. */
  model: string;
  /** Simpler structured tasks (generating exercises, suggesting memories). */
  fastModel: string;
  dailyTokenBudget: number;
  requestsPerMinute: number;
  timeoutMs: number;
}

export const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_DAILY_TOKENS = 60_000;
const DEFAULT_REQUESTS_PER_MINUTE = 8;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
  const provider = env.AI_PROVIDER?.trim().toLowerCase() === "anthropic" && apiKey ? "anthropic" : null;
  const model = env.AI_MODEL?.trim() || DEFAULT_MODEL;
  return {
    provider,
    apiKey,
    model,
    fastModel: env.AI_MODEL_FAST?.trim() || model,
    dailyTokenBudget: positiveInt(env.AI_DAILY_TOKEN_BUDGET_PER_USER, DEFAULT_DAILY_TOKENS),
    requestsPerMinute: positiveInt(env.AI_REQUESTS_PER_MINUTE_PER_USER, DEFAULT_REQUESTS_PER_MINUTE),
    timeoutMs: positiveInt(env.AI_TIMEOUT_MS, 45_000),
  };
}
