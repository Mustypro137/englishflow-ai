import "server-only";
import { AiError } from "@/lib/ai/errors";
import { prisma } from "@/server/db/client";
import { readAiConfig } from "./config";
import type { TokenUsage } from "./types";

const utcDay = (d: Date) => d.toISOString().slice(0, 10);
const WINDOW_MS = 60_000;

export interface UsageLimits {
  requestsPerMinute: number;
  dailyTokenBudget: number;
}

function limits(): UsageLimits {
  const { requestsPerMinute, dailyTokenBudget } = readAiConfig();
  return { requestsPerMinute, dailyTokenBudget };
}

/**
 * Reserve one AI request for the learner, or throw AiError("rate_limited" | "budget_exceeded").
 * Each step is a single conditional UPDATE, so parallel requests can't exceed the limits.
 */
export async function reserveAiRequest(userId: string, now = new Date(), l: UsageLimits = limits()): Promise<void> {
  const day = utcDay(now);
  const row = await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, windowStart: new Date(0) },
    update: {},
  });
  if (row.inputTokens + row.outputTokens >= l.dailyTokenBudget) throw new AiError("budget_exceeded");

  // A new one-minute window starts if the previous one has ended…
  const fresh = await prisma.aiUsage.updateMany({
    where: { id: row.id, windowStart: { lte: new Date(now.getTime() - WINDOW_MS) } },
    data: { windowStart: now, windowCount: 1, requests: { increment: 1 } },
  });
  if (fresh.count === 1) return;
  // …otherwise the request counts towards the current window, if there's room.
  const same = await prisma.aiUsage.updateMany({
    where: { id: row.id, windowCount: { lt: l.requestsPerMinute } },
    data: { windowCount: { increment: 1 }, requests: { increment: 1 } },
  });
  if (same.count === 0) throw new AiError("rate_limited");
}

/** Add the tokens a finished request used to today's total. */
export async function recordAiUsage(userId: string, usage: TokenUsage, now = new Date()): Promise<void> {
  const day = utcDay(now);
  await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, windowStart: new Date(0) },
    update: { inputTokens: { increment: usage.inputTokens }, outputTokens: { increment: usage.outputTokens } },
  });
}

export async function getAiUsageToday(userId: string, now = new Date()) {
  const row = await prisma.aiUsage.findUnique({ where: { userId_day: { userId, day: utcDay(now) } } });
  const used = (row?.inputTokens ?? 0) + (row?.outputTokens ?? 0);
  return { requests: row?.requests ?? 0, tokensUsed: used, tokenBudget: limits().dailyTokenBudget };
}
