import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { generatePractice } from "@/server/ai/generate";
import type { GeneratedExercise } from "@/server/ai/exercises";
import { suggestMemories } from "@/server/ai/memory";
import { setAiProviderForTests } from "@/server/ai/provider";
import { mapProviderError, parseStructured } from "@/server/ai/providers/anthropic";
import { startTutorTurn, type TutorEvent, type TutorTurnInput } from "@/server/ai/tutor";
import type { AiProvider, ChatChunk, ChatRequest, StructuredRequest } from "@/server/ai/types";
import { recordAiUsage, reserveAiRequest } from "@/server/ai/usage";
import { prisma } from "@/server/db/client";
import { getLessonBySlug } from "@/server/db/curriculum";
import { getGeneratedPractice, recordGeneratedAttempt } from "@/server/db/generated";
import { recordAttempt } from "@/server/db/learning-records";
import { completeOnboarding, updatePreferences } from "@/server/db/learner-profile";
import { confirmMemory, deleteMemory, listMemories } from "@/server/db/memory";

const testUsers = { email: { endsWith: "@ai.example.test" } };
const LESSON = "a1-subject-pronouns-and-be";

/** A provider whose behaviour each test sets. Structured output goes through the real validator. */
class MockProvider implements AiProvider {
  readonly name = "mock";
  chatRequests: ChatRequest[] = [];
  structuredRequests: StructuredRequest[] = [];
  reply: (req: ChatRequest) => AsyncIterable<ChatChunk> = async function* () {
    yield { type: "text", text: "Hello! " };
    yield { type: "text", text: "Try one yourself." };
    yield { type: "usage", inputTokens: 120, outputTokens: 30 };
  };
  structured: unknown = { exercises: [] };
  isConfigured() {
    return true;
  }
  chat(req: ChatRequest) {
    this.chatRequests.push(req);
    return this.reply(req);
  }
  async generateStructured<T>(req: StructuredRequest, schema: z.ZodType<T>) {
    this.structuredRequests.push(req);
    if (this.structured instanceof Error) throw this.structured;
    const raw = typeof this.structured === "string" ? this.structured : JSON.stringify(this.structured);
    return { data: parseStructured(raw, schema), usage: { inputTokens: 500, outputTokens: 400 } };
  }
}

async function createLearner(opts: { sharing?: boolean } = {}) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@ai.example.test`, emailVerified: true },
  });
  await completeOnboarding(user.id, {
    displayName: "Learner",
    goals: [],
    nativeLanguage: null,
    selfReportedLevel: "A1",
    dailyMinutes: 20,
    explanationStyle: "concise",
    timezone: "UTC",
  });
  if (opts.sharing) {
    await updatePreferences(user.id, {
      dailyMinutes: 20,
      explanationStyle: "concise",
      translationSupport: true,
      textScale: "normal",
      reducedMotion: false,
      gamificationEnabled: true,
      tutorHintMode: "hint_first",
      aiContextSharing: true,
    });
  }
  return user;
}

const turn = (patch: Partial<TutorTurnInput> = {}): TutorTurnInput => ({
  conversationId: null,
  mode: "explain",
  message: "When do I use 'are'?",
  style: "concise",
  lessonSlug: null,
  ...patch,
});

async function collect(events: AsyncGenerator<TutorEvent>) {
  const out: TutorEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
}

async function expectAiError(promise: Promise<unknown>, kind: string) {
  await expect(promise).rejects.toBeInstanceOf(AiError);
  await promise.catch((e: AiError) => expect(e.kind).toBe(kind));
}

async function cleanUp() {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.exercise.deleteMany({ where: { source: "ai" } }); // test schema only
}

beforeAll(cleanUp);
afterEach(() => setAiProviderForTests(null));
afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe("without an AI provider", () => {
  it("reports 'not configured' and stores nothing", async () => {
    const user = await createLearner();
    await expectAiError(startTutorTurn(user.id, turn()), "not_configured");
    await expectAiError(generatePractice(user.id, "anything"), "not_configured");
    expect(await prisma.tutorConversation.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.aiUsage.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("tutor conversations (mocked provider)", () => {
  it("streams a reply, saves both messages and records usage", async () => {
    const mock = new MockProvider();
    setAiProviderForTests(mock);
    const user = await createLearner();
    const events = await collect(await startTutorTurn(user.id, turn()));
    expect(events.map((e) => e.type)).toEqual(["conversation", "text", "text", "done"]);
    const conversationId = (events[0] as { id: string }).id;
    const messages = await prisma.tutorMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "When do I use 'are'?"],
      ["assistant", "Hello! Try one yourself."],
    ]);
    const usage = await prisma.aiUsage.findFirst({ where: { userId: user.id } });
    expect(usage).toMatchObject({ requests: 1, inputTokens: 120, outputTokens: 30 });

    // A follow-up continues the same conversation with its history.
    await collect(await startTutorTurn(user.id, turn({ conversationId, message: "Thanks" })));
    expect(mock.chatRequests[1].messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("turns a timeout into a friendly error and never saves a partial reply", async () => {
    const mock = new MockProvider();
    mock.reply = async function* () {
      yield { type: "text", text: "Half an ans" };
      throw new AiError("timeout");
    };
    setAiProviderForTests(mock);
    const user = await createLearner();
    const events = await collect(await startTutorTurn(user.id, turn()));
    const error = events.at(-1);
    expect(error).toMatchObject({ type: "error", kind: "timeout" });
    expect((error as { message: string }).message).toContain("still work");
    const roles = await prisma.tutorMessage.findMany({
      where: { conversation: { userId: user.id } },
      select: { role: true },
    });
    expect(roles).toEqual([{ role: "user" }]);
  });

  it("maps a provider 5xx to 'unavailable'", async () => {
    const mock = new MockProvider();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mock.reply = async function* () {
      throw mapProviderError(Anthropic.APIError.generate(503, {}, "overloaded", new Headers()));
    };
    setAiProviderForTests(mock);
    const user = await createLearner();
    const events = await collect(await startTutorTurn(user.id, turn()));
    expect(events.at(-1)).toMatchObject({ type: "error", kind: "unavailable" });
    vi.restoreAllMocks();
  });

  it("refuses another learner's conversation", async () => {
    setAiProviderForTests(new MockProvider());
    const a = await createLearner();
    const b = await createLearner();
    const events = await collect(await startTutorTurn(a.id, turn()));
    const id = (events[0] as { id: string }).id;
    await expectAiError(startTutorTurn(b.id, turn({ conversationId: id })), "bad_request");
    expect(await prisma.tutorMessage.count({ where: { conversationId: id } })).toBe(2);
  });

  it("sends learning history only when the learner allows it", async () => {
    const lesson = (await getLessonBySlug(LESSON))!;
    const mc = lesson.exercises.guided.find((e) => e.type === "multiple_choice")!;
    const optionId = mc.type === "multiple_choice" ? mc.options[0].id : "";

    for (const sharing of [false, true]) {
      const mock = new MockProvider();
      setAiProviderForTests(mock);
      const user = await createLearner({ sharing });
      await recordAttempt(user.id, { exerciseId: mc.id, response: { optionId }, hintsUsed: 0, revealedAnswer: false });
      await collect(await startTutorTurn(user.id, turn({ lessonSlug: LESSON })));
      const system = mock.chatRequests[0].dynamicSystem;
      expect(system).toContain(`Current lesson: ${lesson.title}`);
      expect(system).not.toContain(user.email);
      expect(system).not.toContain(user.id);
      if (sharing) expect(system).toContain("Recent answers:");
      else {
        expect(system).toContain("has not shared");
        expect(system).not.toContain("Recent answers:");
      }
    }
  });
});

describe("usage limits", () => {
  it("enforces requests per minute and the daily token budget", async () => {
    const user = await createLearner();
    const limits = { requestsPerMinute: 2, dailyTokenBudget: 1000 };
    const now = new Date("2026-10-17T10:00:00Z");
    await reserveAiRequest(user.id, now, limits);
    await reserveAiRequest(user.id, now, limits);
    await expectAiError(reserveAiRequest(user.id, now, limits), "rate_limited");
    // A minute later there is room again.
    await reserveAiRequest(user.id, new Date(now.getTime() + 61_000), limits);

    await recordAiUsage(user.id, { inputTokens: 700, outputTokens: 400 }, now);
    await expectAiError(reserveAiRequest(user.id, new Date(now.getTime() + 200_000), limits), "budget_exceeded");
    // The budget is per UTC day.
    await reserveAiRequest(user.id, new Date("2026-10-18T00:05:00Z"), limits);
  });

  it("blocks the tutor once the learner is over the limit", async () => {
    setAiProviderForTests(new MockProvider());
    const user = await createLearner();
    const day = new Date().toISOString().slice(0, 10);
    await prisma.aiUsage.create({ data: { userId: user.id, day, inputTokens: 10_000_000, windowStart: new Date(0) } });
    await expectAiError(startTutorTurn(user.id, turn()), "budget_exceeded");
    expect(await prisma.tutorConversation.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("AI-generated practice (mocked provider)", () => {
  async function concept() {
    const lesson = (await getLessonBySlug(LESSON))!;
    const slug = lesson.concepts[0].slug;
    const row = await prisma.concept.findUniqueOrThrow({ where: { slug } });
    return { slug, id: row.id, level: row.levelCode };
  }

  const exercise = (slug: string, level: string, patch: Partial<GeneratedExercise> = {}): GeneratedExercise => ({
    type: "gap_fill",
    level: level as GeneratedExercise["level"],
    conceptSlugs: [slug],
    objective: "Use the right form of be",
    instructions: "Write the correct form of be.",
    question: `They ___ students at ${randomUUID().slice(0, 8)} College.`,
    transformInstruction: null,
    options: null,
    acceptedAnswers: ["are"],
    wrongAnswers: [{ answer: "is", why: "They is plural, so use are." }],
    explanation: "With they, use are.",
    hint: "They = more than one person.",
    difficulty: 1,
    ...patch,
  });

  it("rejects invalid structured output and stores nothing", async () => {
    const c = await concept();
    const user = await createLearner();
    const before = await prisma.exercise.count({ where: { source: "ai" } });
    const mock = new MockProvider();
    setAiProviderForTests(mock);

    mock.structured = "this is not JSON";
    await expectAiError(generatePractice(user.id, c.slug), "invalid_output");
    mock.structured = { exercises: [{ type: "essay" }] };
    await expectAiError(generatePractice(user.id, c.slug), "invalid_output");
    // Schema-valid but contradictory: a "wrong" answer is also accepted.
    mock.structured = {
      exercises: [exercise(c.slug, c.level, { wrongAnswers: [{ answer: "are", why: "x" }] })],
    };
    await expectAiError(generatePractice(user.id, c.slug), "invalid_output");
    expect(await prisma.exercise.count({ where: { source: "ai" } })).toBe(before);
  });

  it("stores only the items that pass, skips duplicates, and keeps answers out of mastery", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = await concept();
    const user = await createLearner();
    const mock = new MockProvider();
    setAiProviderForTests(mock);
    const good = exercise(c.slug, c.level);
    mock.structured = {
      exercises: [good, good, exercise(c.slug, c.level, { level: "C2" }), exercise(c.slug, c.level)],
    };
    const outcome = await generatePractice(user.id, c.slug);
    expect(outcome).toEqual({ stored: 2, rejected: 2 });
    expect(mock.structuredRequests[0].prompt).toContain(c.slug);

    const { exercises } = await getGeneratedPractice(user.id, c.id);
    expect(exercises.length).toBeGreaterThanOrEqual(2);
    const stored = await prisma.exercise.findUniqueOrThrow({ where: { id: exercises[0].id } });
    expect(stored).toMatchObject({ source: "ai", reviewStatus: "ai_generated_unreviewed", lessonId: null });

    const progressBefore = await prisma.conceptProgress.findMany({ where: { userId: user.id } });
    const result = await recordGeneratedAttempt(user.id, {
      exerciseId: exercises[0].id,
      response: { answers: ["is"] },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    expect(result.correct).toBe(false);
    expect(result.feedback).toContain("plural");
    expect(await prisma.exerciseAttempt.count({ where: { userId: user.id, context: "generated" } })).toBe(1);
    expect(await prisma.conceptProgress.findMany({ where: { userId: user.id } })).toEqual(progressBefore);
    expect(await prisma.reviewItem.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.mistakeRecord.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } })).estimatedLevel).toBe("A1");

    // Answered exercises leave the learner's set; others still see them (shared cache).
    expect((await getGeneratedPractice(user.id, c.id)).answered).toBe(1);
    const other = await createLearner();
    expect((await getGeneratedPractice(other.id, c.id)).answered).toBe(0);
    vi.restoreAllMocks();
  });

  it("only generates for concepts taught by a published lesson", async () => {
    setAiProviderForTests(new MockProvider());
    const user = await createLearner();
    await expectAiError(generatePractice(user.id, "no-such-concept"), "bad_request");
  });
});

describe("learner memory", () => {
  it("stores AI suggestions unconfirmed, and only the owner can manage them", async () => {
    const mock = new MockProvider();
    setAiProviderForTests(mock);
    const user = await createLearner({ sharing: true });
    const events = await collect(await startTutorTurn(user.id, turn({ message: "I always forget 'are'." })));
    const conversationId = (events[0] as { id: string }).id;

    mock.structured = {
      memories: [
        { kind: "recurring_error", content: "Forgets to use 'are' with they" },
        { kind: "recurring_error", content: "forgets to use 'are' with THEY" },
      ],
    };
    expect(await suggestMemories(user.id, conversationId)).toBe(1);
    const [memory] = await listMemories(user.id);
    expect(memory).toMatchObject({ source: "ai", verified: false });

    // Unconfirmed: not sent to the tutor.
    await collect(await startTutorTurn(user.id, turn({ conversationId, message: "Again?" })));
    expect(mock.chatRequests.at(-1)!.dynamicSystem).not.toContain("Forgets to use");

    const other = await createLearner();
    expect(await confirmMemory(other.id, memory.id)).toBe(false);
    expect(await deleteMemory(other.id, memory.id)).toBe(false);
    await expectAiError(suggestMemories(other.id, conversationId), "bad_request");

    expect(await confirmMemory(user.id, memory.id)).toBe(true);
    await collect(await startTutorTurn(user.id, turn({ conversationId, message: "And now?" })));
    expect(mock.chatRequests.at(-1)!.dynamicSystem).toContain("Forgets to use 'are' with they");
    expect(await deleteMemory(user.id, memory.id)).toBe(true);
  });
});
