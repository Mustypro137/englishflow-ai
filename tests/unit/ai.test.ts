import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { AiError } from "@/lib/ai/errors";
import { parseInline, parseMarkdown } from "@/lib/ai/markdown";
import { readAiConfig } from "@/server/ai/config";
import { type ContextRecords, formatContext, selectContext } from "@/server/ai/context";
import {
  buildGeneratedExercise,
  exerciseHash,
  type GeneratedExercise,
  generationResponseSchema,
} from "@/server/ai/exercises";
import { memorySuggestionSchema } from "@/server/ai/memory-schema";
import { historyForModel, TUTOR_SYSTEM_PROMPT, tutorDynamicPrompt } from "@/server/ai/prompts";
import { mapProviderError, parseStructured } from "@/server/ai/providers/anthropic";

describe("readAiConfig", () => {
  it("is not configured without both a provider and a key", () => {
    expect(readAiConfig({}).provider).toBeNull();
    expect(readAiConfig({ AI_PROVIDER: "anthropic" }).provider).toBeNull();
    expect(readAiConfig({ ANTHROPIC_API_KEY: "sk-ant-x" }).provider).toBeNull();
    expect(readAiConfig({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "  " }).provider).toBeNull();
    expect(readAiConfig({ AI_PROVIDER: "Anthropic", ANTHROPIC_API_KEY: "sk-ant-x" }).provider).toBe("anthropic");
  });

  it("reads models and limits, falling back on invalid numbers", () => {
    const c = readAiConfig({
      AI_MODEL: "claude-sonnet-5-5",
      AI_DAILY_TOKEN_BUDGET_PER_USER: "abc",
      AI_REQUESTS_PER_MINUTE_PER_USER: "3",
    });
    expect(c.model).toBe("claude-sonnet-5-5");
    expect(c.fastModel).toBe("claude-sonnet-5-5");
    expect(c.requestsPerMinute).toBe(3);
    expect(c.dailyTokenBudget).toBeGreaterThan(0);
  });
});

const target = { conceptSlug: "a1-articles", level: "A1" as const, skill: "grammar" as const };

function item(patch: Partial<GeneratedExercise> = {}): GeneratedExercise {
  return {
    type: "gap_fill",
    level: "A1",
    conceptSlugs: ["a1-articles"],
    objective: "Use a and an",
    instructions: "Write a or an.",
    question: "She is ___ engineer.",
    transformInstruction: null,
    options: null,
    acceptedAnswers: ["an"],
    wrongAnswers: [{ answer: "a", why: "Use an before a vowel sound." }],
    explanation: "Engineer starts with a vowel sound, so we use an.",
    hint: null,
    difficulty: 1,
    ...patch,
  };
}

describe("AI-generated exercises", () => {
  it("accepts a well-formed exercise and builds a normal curriculum exercise", () => {
    const r = buildGeneratedExercise(item(), target);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.exercise).toMatchObject({ type: "gap_fill", skill: "grammar", concepts: ["a1-articles"] });
    expect(r.exercise.slug).toMatch(/^ai-[0-9a-f]{20}$/);
  });

  it("accepts multiple choice and maps wrong-answer feedback to options", () => {
    const r = buildGeneratedExercise(
      item({
        type: "multiple_choice",
        question: "I have ___ umbrella.",
        options: ["a", "an", "the"],
        acceptedAnswers: ["an"],
        wrongAnswers: [{ answer: "a", why: "Umbrella starts with a vowel sound." }],
      }),
      target,
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.exercise.type === "multiple_choice") {
      expect(r.exercise.payload.correct).toBe("b");
      expect(r.exercise.payload.optionFeedback).toEqual({ a: "Umbrella starts with a vowel sound." });
    }
  });

  it.each([
    ["the wrong level", item({ level: "B2" })],
    ["an unrelated concept", item({ conceptSlugs: ["b1-passive"] })],
    ["no concept", item({ conceptSlugs: [] })],
    ["no accepted answer", item({ acceptedAnswers: [" "] })],
    ["two blanks in a gap fill", item({ question: "___ engineer is ___ here." })],
    ["no blank in a gap fill", item({ question: "She is an engineer." })],
    ["a wrong answer that is also accepted", item({ wrongAnswers: [{ answer: "an", why: "?" }] })],
    ["difficulty out of range", item({ difficulty: 9 })],
    ["HTML in the text", item({ explanation: "<script>alert(1)</script>" })],
    ["text that is far too long", item({ explanation: "x".repeat(500) })],
    [
      "a correct option that isn't an option",
      item({ type: "multiple_choice", options: ["a", "the", "some"], acceptedAnswers: ["an"] }),
    ],
    [
      "two correct options",
      item({ type: "multiple_choice", options: ["a", "an", "the"], acceptedAnswers: ["an", "the"] }),
    ],
    ["only two options", item({ type: "multiple_choice", options: ["a", "an"], acceptedAnswers: ["an"] })],
    [
      "an error-correction sentence that is already correct",
      item({ type: "error_correction", question: "She is an engineer.", acceptedAnswers: ["She is an engineer."] }),
    ],
    [
      "a transformation without an instruction",
      item({ type: "transformation", question: "She is an engineer.", acceptedAnswers: ["She isn't an engineer."] }),
    ],
  ])("rejects %s", (_label, bad) => {
    expect(buildGeneratedExercise(bad, target).ok).toBe(false);
  });

  it("rejects malformed model output at the schema level", () => {
    for (const bad of [
      { exercises: [{ type: "essay" }] },
      { exercises: [{ ...item(), acceptedAnswers: "an" }] },
      { exercises: [{ ...item(), difficulty: "easy" }] },
      { items: [] },
      null,
    ]) {
      expect(generationResponseSchema.safeParse(bad).success).toBe(false);
    }
    expect(generationResponseSchema.safeParse({ exercises: [item()] }).success).toBe(true);
  });

  it("hashes the same question the same way regardless of case, spacing and option order", () => {
    expect(exerciseHash("multiple_choice", "I have ___ umbrella.", ["a", "an"])).toBe(
      exerciseHash("multiple_choice", "  i HAVE ___   umbrella ", ["An", "A"]),
    );
    expect(exerciseHash("gap_fill", "She is ___ engineer.")).not.toBe(exerciseHash("gap_fill", "He is ___ actor."));
  });
});

describe("structured output parsing", () => {
  it("rejects non-JSON and schema-invalid output", () => {
    expect(() => parseStructured("not json", memorySuggestionSchema)).toThrow(AiError);
    expect(() => parseStructured('{"memories":[{"kind":"secret","content":"x"}]}', memorySuggestionSchema)).toThrow(
      AiError,
    );
    try {
      parseStructured("{", memorySuggestionSchema);
    } catch (e) {
      expect((e as AiError).kind).toBe("invalid_output");
    }
    expect(parseStructured('{"memories":[]}', memorySuggestionSchema)).toEqual({ memories: [] });
  });

  it("limits memory suggestions to three short notes", () => {
    const four = Array.from({ length: 4 }, () => ({ kind: "goal", content: "Pass an exam" }));
    expect(memorySuggestionSchema.safeParse({ memories: four }).success).toBe(false);
  });
});

describe("provider error mapping", () => {
  it("turns provider failures into friendly kinds without leaking details", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(mapProviderError(new Anthropic.APIConnectionTimeoutError()).kind).toBe("timeout");
    expect(mapProviderError(new Error("x"), true).kind).toBe("timeout");
    const server = Anthropic.APIError.generate(500, { error: { message: "boom" } }, "boom", new Headers());
    const err = mapProviderError(server);
    expect(err.kind).toBe("unavailable");
    expect(err.userMessage).not.toContain("boom");
    expect(mapProviderError(Anthropic.APIError.generate(401, {}, "bad key", new Headers())).kind).toBe("unavailable");
    spy.mockRestore();
  });
});

const records: ContextRecords & Record<string, unknown> = {
  profile: { estimatedLevel: "A2", selfReportedLevel: "B1", levelSource: "placement" },
  sharing: true,
  lesson: { title: "Articles", objective: "Use a, an and the" },
  attempts: [
    { objective: "Use an before vowels", answer: "a apple", isCorrect: false },
    ...Array.from({ length: 10 }, (_, i) => ({ objective: `Task ${i}`, answer: "x", isCorrect: true })),
  ],
  mistakes: [
    { conceptName: "Articles", originalAnswer: "a apple", correctAnswer: "an apple" },
    { conceptName: "Articles", originalAnswer: "a egg", correctAnswer: "an egg" },
    { conceptName: "Plurals", originalAnswer: "childs", correctAnswer: "children" },
  ],
  savedWords: [{ word: "umbrella" }],
  conceptStates: ["mastered", "learning", "learning", "new"],
  memories: [
    { kind: "preference", content: "Likes examples about football", verified: true },
    { kind: "recurring_error", content: "Unconfirmed guess", verified: false },
  ],
  // Fields that must never reach the model:
  email: "ada@example.com",
  userId: "user_123",
};

describe("tutor context", () => {
  it("includes only the allowed fields", () => {
    const ctx = selectContext(records);
    const json = JSON.stringify(ctx);
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("user_123");
    expect(Object.keys(ctx).sort()).toEqual(["history", "lesson", "level", "levelSource"]);
    expect(Object.keys(ctx.history!).sort()).toEqual([
      "memories",
      "misconceptions",
      "progress",
      "recentAttempts",
      "vocabulary",
    ]);
    expect(ctx.level).toBe("A2");
    expect(ctx.history!.recentAttempts).toHaveLength(5);
    expect(ctx.history!.misconceptions[0]).toMatchObject({ concept: "Articles", times: 2 });
    expect(ctx.history!.progress).toEqual({ mastered: 1, practicing: 0, learning: 2 });
  });

  it("never uses unconfirmed AI suggestions as facts", () => {
    const ctx = selectContext(records);
    expect(ctx.history!.memories).toEqual([{ kind: "preference", content: "Likes examples about football" }]);
    expect(formatContext(ctx)).not.toContain("Unconfirmed guess");
  });

  it("sends no learning history when sharing is off", () => {
    const ctx = selectContext({ ...records, sharing: false });
    expect(ctx.history).toBeNull();
    const text = formatContext(ctx);
    expect(text).toContain("Working level: A2 (estimated from a short placement check)");
    expect(text).toContain("has not shared");
    expect(text).not.toContain("a apple");
  });

  it("labels a self-reported level as the learner's own estimate", () => {
    const ctx = selectContext({
      ...records,
      profile: { estimatedLevel: null, selfReportedLevel: "B1", levelSource: null },
    });
    expect(formatContext(ctx)).toContain("B1 (the learner's own estimate)");
  });
});

describe("tutor prompts", () => {
  it("keeps a stable shared prefix and puts learner settings in the dynamic part", () => {
    expect(TUTOR_SYSTEM_PROMPT).toContain("Never invent grammar rules");
    const dyn = tutorDynamicPrompt({
      mode: "quiz",
      style: "concise",
      hintMode: "hint_first",
      context: selectContext({ ...records, sharing: false }),
    });
    expect(dyn).toContain("Quiz me");
    expect(dyn).toContain("give a hint first");
    expect(dyn).toContain("<learning_context>");
    expect(dyn).toContain("Working level: A2");
    expect(TUTOR_SYSTEM_PROMPT).not.toContain("Working level");
  });

  it("builds a history that starts with the learner and merges repeated roles", () => {
    expect(
      historyForModel([
        { role: "assistant", content: "Hello" },
        { role: "user", content: "One" },
        { role: "user", content: "Two" },
        { role: "assistant", content: "Reply" },
        { role: "user", content: "Three" },
      ]),
    ).toEqual([
      { role: "user", content: "One\n\nTwo" },
      { role: "assistant", content: "Reply" },
      { role: "user", content: "Three" },
    ]);
  });

  it("drops the oldest turns when the history is too long", () => {
    const long = "x".repeat(9000);
    const out = historyForModel([
      { role: "user", content: long },
      { role: "assistant", content: long },
      { role: "user", content: "latest" },
    ]);
    expect(out.at(-1)).toEqual({ role: "user", content: "latest" });
    expect(out.length).toBeLessThan(3);
  });
});

describe("safe markdown", () => {
  it("parses the supported subset", () => {
    const blocks = parseMarkdown(
      "### Rule\nUse **an** before *vowel* sounds.\n\n- an apple\n- an hour\n\n1. One\n2. Two",
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list"]);
    expect(parseInline("Use **an** and `the`")).toEqual([
      { type: "text", text: "Use " },
      { type: "strong", text: "an" },
      { type: "text", text: " and " },
      { type: "code", text: "the" },
    ]);
  });

  it("keeps HTML as plain text", () => {
    const blocks = parseMarkdown('<img src=x onerror="alert(1)"> and <b>bold</b>');
    expect(blocks).toEqual([
      {
        type: "paragraph",
        lines: [[{ type: "text", text: '<img src=x onerror="alert(1)"> and <b>bold</b>' }]],
      },
    ]);
  });

  it("handles an unfinished code block while streaming", () => {
    expect(parseMarkdown("```\nI am")).toEqual([{ type: "code", text: "I am" }]);
  });
});
