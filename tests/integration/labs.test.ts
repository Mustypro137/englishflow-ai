import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { findListening, findReading } from "@/lib/labs/content";
import { setAiProviderForTests } from "@/server/ai/provider";
import { parseStructured } from "@/server/ai/providers/anthropic";
import { startTutorTurn, type TutorEvent } from "@/server/ai/tutor";
import type { AiProvider, ChatChunk, ChatRequest, StructuredRequest } from "@/server/ai/types";
import { requestWritingFeedback } from "@/server/ai/writing";
import { prisma } from "@/server/db/client";
import { InvalidResponseError } from "@/server/db/learning-records";
import { submitPlacement } from "@/server/db/learning-records";
import { completeLabActivity, getLabHistory, recordLabAttempt, recordPronunciationPractice } from "@/server/db/labs";
import { completeOnboarding } from "@/server/db/learner-profile";
import { getSavedWords, saveGlossaryWord, savedGlossaryWords } from "@/server/db/vocabulary";
import { createDraft, getDraft, listDrafts } from "@/server/db/writing";
import { pickSkillPractice } from "@/server/labs/pick";

const testUsers = { email: { endsWith: "@labs.example.test" } };

class MockProvider implements AiProvider {
  readonly name = "mock";
  chatRequests: ChatRequest[] = [];
  structuredRequests: StructuredRequest[] = [];
  structured: unknown = {};
  isConfigured() {
    return true;
  }
  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    this.chatRequests.push(req);
    yield { type: "text", text: "Of course. Small or large?" };
    yield { type: "usage", inputTokens: 50, outputTokens: 10 };
  }
  async generateStructured<T>(req: StructuredRequest, schema: z.ZodType<T>) {
    this.structuredRequests.push(req);
    return {
      data: parseStructured(JSON.stringify(this.structured), schema),
      usage: { inputTokens: 300, outputTokens: 200 },
    };
  }
}

async function createLearner() {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@labs.example.test`, emailVerified: true },
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
  return user;
}

const exerciseId = async (slug: string) => (await prisma.exercise.findUniqueOrThrow({ where: { slug } })).id;

async function cleanUp() {
  await prisma.user.deleteMany({ where: testUsers });
}

beforeAll(cleanUp);
afterEach(() => setAiProviderForTests(null));
afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe("listening and reading questions", () => {
  it("seeds every lab question as a lab exercise", async () => {
    const item = findListening("a1-at-the-cafe")!;
    const rows = await prisma.exercise.findMany({ where: { slug: { in: item.questions.map((q) => q.slug) } } });
    expect(rows).toHaveLength(item.questions.length);
    expect(rows.every((r) => r.phase === "skill_lab" && r.skill === "listening" && r.lessonId === null)).toBe(true);
    const placement = await prisma.exercise.count({ where: { phase: "placement", placementSection: "listening" } });
    expect(placement).toBeGreaterThanOrEqual(4);
  });

  it("grades on the server and records skill practice without touching mastery, reviews or mistakes", async () => {
    const user = await createLearner();
    const id = await exerciseId("listen-a1-cafe-q1");
    const wrong = await recordLabAttempt(user.id, {
      exerciseId: id,
      response: { optionId: "a" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    expect(wrong.correct).toBe(false);
    const right = await recordLabAttempt(user.id, {
      exerciseId: id,
      response: { optionId: "b" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    expect(right.correct).toBe(true);
    const attempts = await prisma.exerciseAttempt.findMany({ where: { userId: user.id } });
    expect(attempts.map((a) => a.context)).toEqual(["skill_lab", "skill_lab"]);
    expect(await prisma.conceptProgress.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.reviewItem.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.mistakeRecord.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses lesson and placement exercises", async () => {
    const user = await createLearner();
    const lessonExercise = await prisma.exercise.findFirstOrThrow({ where: { phase: "guided" } });
    await expect(
      recordLabAttempt(user.id, { exerciseId: lessonExercise.id, response: {}, hintsUsed: 0, revealedAnswer: false }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it("scores the first answer to each question since the last completion, and recomputes dictation", async () => {
    const user = await createLearner();
    const item = findListening("a1-at-the-cafe")!;
    const slugs = item.questions.map((q) => q.slug);
    const q1 = await exerciseId(slugs[0]);
    const q4 = await exerciseId(slugs[3]);
    await recordLabAttempt(user.id, {
      exerciseId: q1,
      response: { optionId: "a" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    await recordLabAttempt(user.id, {
      exerciseId: q1,
      response: { optionId: "b" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    await recordLabAttempt(user.id, {
      exerciseId: q4,
      response: { answer: "£6.50" },
      hintsUsed: 0,
      revealedAnswer: false,
    });

    const first = await completeLabActivity(user.id, {
      skill: "listening",
      itemSlug: item.slug,
      mode: "audio",
      questionSlugs: slugs,
      dictation: [{ line: 1, expected: item.lines[1].text, typed: "hi can I have a coffee please" }],
    });
    expect(first).toMatchObject({ correct: 1, total: 4, answered: 2 });
    expect(first.dictation[0]).toMatchObject({ line: 1, exact: true, accuracy: 1 });

    // A second run only counts answers given after the first completion.
    await recordLabAttempt(user.id, {
      exerciseId: q1,
      response: { optionId: "b" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    const second = await completeLabActivity(user.id, {
      skill: "listening",
      itemSlug: item.slug,
      mode: "text",
      questionSlugs: slugs,
    });
    expect(second).toMatchObject({ correct: 1, answered: 1 });

    const history = await getLabHistory(user.id, "listening");
    expect(history.get(item.slug)).toMatchObject({ times: 2, lastCorrect: 1, lastMode: "text" });
  });

  it("keeps each learner's lab history private", async () => {
    const a = await createLearner();
    const b = await createLearner();
    await completeLabActivity(a.id, { skill: "reading", itemSlug: "a1-our-street", mode: "text", questionSlugs: [] });
    await recordPronunciationPractice(a.id, {
      setSlug: "short-i-long-ee",
      activity: "spelling",
      mode: "text",
      correct: 9,
      total: 7,
    });
    expect((await getLabHistory(a.id, "reading")).size).toBe(1);
    expect((await getLabHistory(b.id, "reading")).size).toBe(0);
    const pron = await prisma.skillActivity.findFirstOrThrow({ where: { userId: a.id, skill: "pronunciation" } });
    expect(pron).toMatchObject({ correct: 7, total: 7 }); // clamped: never more right than asked
  });

  it("picks the next listening or reading item for the study plan", async () => {
    const user = await createLearner();
    const first = await pickSkillPractice(user.id, "A1");
    expect(first).toMatchObject({ skill: "listening", href: expect.stringMatching(/^\/app\/listening\/a1-/) });
    await completeLabActivity(user.id, { skill: "listening", itemSlug: first!.slug, mode: "audio", questionSlugs: [] });
    const next = await pickSkillPractice(user.id, "A1");
    expect(next?.skill).toBe("reading");
  });
});

describe("saving words from a reading text", () => {
  it("saves a vocabulary word with its sentence and schedules it once", async () => {
    const user = await createLearner();
    const text = findReading("a1-lena-and-her-family")!;
    const input = {
      word: "cousin",
      definition: "The child of your aunt or uncle.",
      entrySlug: "a1-cousin",
      sentence: "I live in a small flat in Lisbon with my cousin, Inês.",
      title: text.title,
    };
    expect(await saveGlossaryWord(user.id, input)).toEqual({ saved: "word" });
    expect(await saveGlossaryWord(user.id, input)).toEqual({ saved: "word" });
    const words = await getSavedWords(user.id, "UTC");
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ headword: "cousin", sourceSentence: input.sentence, sourceTitle: text.title });
    expect(await prisma.reviewItem.count({ where: { userId: user.id, itemType: "vocabulary" } })).toBe(1);
  });

  it("saves other glossary words as one flashcard with the sentence", async () => {
    const user = await createLearner();
    const input = {
      word: "friendly",
      definition: "Kind and nice to other people.",
      entrySlug: null,
      sentence: "He is very friendly.",
      title: "Lena and her family",
    };
    expect(await saveGlossaryWord(user.id, input)).toEqual({ saved: "flashcard" });
    expect(await saveGlossaryWord(user.id, input)).toEqual({ saved: "flashcard" });
    const cards = await prisma.flashcard.findMany({ where: { userId: user.id } });
    expect(cards).toHaveLength(1);
    expect(cards[0].note).toBe("From “Lena and her family”: He is very friendly.");
    expect(await prisma.reviewItem.count({ where: { userId: user.id, itemType: "flashcard" } })).toBe(1);
    const saved = await savedGlossaryWords(user.id, findReading("a1-lena-and-her-family")!.glossary);
    expect([...saved]).toEqual(["friendly"]);
  });
});

describe("writing workshop", () => {
  const feedback = {
    correctness: [
      { original: "I has", corrected: "I have", explanation: "Use have with I.", category: "grammar" },
      { original: "we was", corrected: "we were", explanation: "Not in the text.", category: "grammar" },
    ],
    naturalness: [],
    style: [],
    correctedText: "I have a sister. She lives in Rome.",
    meaningCheck: "Your meaning is clear.",
    summary: "One grammar error.",
    nextStep: "Check have/has.",
  };

  it("keeps drafts and rewrites private to their owner", async () => {
    const a = await createLearner();
    const b = await createLearner();
    const first = await createDraft(a.id, {
      kind: "journal",
      taskSlug: null,
      title: "Day one",
      text: "I has a sister.",
      parentId: null,
    });
    expect(first.ok).toBe(true);
    const id = (first as { id: string }).id;
    expect(await getDraft(b.id, id)).toBeNull();
    expect(await createDraft(b.id, { kind: "journal", taskSlug: null, title: null, text: "x", parentId: id })).toEqual({
      ok: false,
      reason: "not_found",
    });
    const rewrite = await createDraft(a.id, {
      kind: "journal",
      taskSlug: null,
      title: null,
      text: "I have a sister.",
      parentId: id,
    });
    const view = await getDraft(a.id, (rewrite as { id: string }).id);
    expect(view).toMatchObject({ version: 2, wordCount: 4, parent: { id, text: "I has a sister." } });
    expect((await getDraft(a.id, id))?.rewrites).toHaveLength(1);
    expect(await listDrafts(b.id)).toHaveLength(0);
  });

  it("says AI feedback isn't set up, without storing anything", async () => {
    const user = await createLearner();
    const draft = await createDraft(user.id, {
      kind: "task",
      taskSlug: "a1-introduce-yourself",
      title: null,
      text: "I has a sister.",
      parentId: null,
    });
    await expect(requestWritingFeedback(user.id, (draft as { id: string }).id, { style: false })).rejects.toMatchObject(
      {
        kind: "not_configured",
      },
    );
    expect(await prisma.aiUsage.count({ where: { userId: user.id } })).toBe(0);
  });

  it("stores validated three-layer feedback, drops invented items and reuses it", async () => {
    const mock = new MockProvider();
    mock.structured = feedback;
    setAiProviderForTests(mock);
    const user = await createLearner();
    const draft = await createDraft(user.id, {
      kind: "task",
      taskSlug: "a1-introduce-yourself",
      title: null,
      text: "I has a sister. She lives in Rome.",
      parentId: null,
    });
    const id = (draft as { id: string }).id;
    const { feedback: stored, reused } = await requestWritingFeedback(user.id, id, { style: false });
    expect(reused).toBe(false);
    expect(stored.correctness.map((c) => c.original)).toEqual(["I has"]);
    expect(stored.dropped).toBe(1);
    expect(stored.style).toBeNull();
    expect(mock.structuredRequests[0].prompt).toContain(
      "<learner_text>\nI has a sister. She lives in Rome.\n</learner_text>",
    );
    expect(mock.structuredRequests[0].prompt).toContain("Task: You are joining an online English class.");

    const again = await requestWritingFeedback(user.id, id, { style: false });
    expect(again.reused).toBe(true);
    expect(mock.structuredRequests).toHaveLength(1);
    expect((await getDraft(user.id, id))?.feedback?.summary).toBe("One grammar error.");
    expect(await prisma.aiUsage.findFirst({ where: { userId: user.id } })).toMatchObject({
      requests: 1,
      inputTokens: 300,
    });

    const other = await createLearner();
    await expect(requestWritingFeedback(other.id, id, { style: false })).rejects.toBeInstanceOf(AiError);
  });

  it("tells the model about the previous version when feedback is for a rewrite", async () => {
    const mock = new MockProvider();
    mock.structured = { ...feedback, correctness: [], correctedText: "I have a sister." };
    setAiProviderForTests(mock);
    const user = await createLearner();
    const first = await createDraft(user.id, {
      kind: "journal",
      taskSlug: null,
      title: null,
      text: "I has a sister.",
      parentId: null,
    });
    const second = await createDraft(user.id, {
      kind: "journal",
      taskSlug: null,
      title: null,
      text: "I have a sister.",
      parentId: (first as { id: string }).id,
    });
    await requestWritingFeedback(user.id, (second as { id: string }).id, { style: true });
    expect(mock.structuredRequests[0].prompt).toContain("<previous_text>\nI has a sister.\n</previous_text>");
    expect(mock.structuredRequests[0].prompt).toContain("Style suggestions requested: yes");
  });
});

describe("conversation role-plays", () => {
  async function collect(events: AsyncGenerator<TutorEvent>) {
    const out: TutorEvent[] = [];
    for await (const e of events) out.push(e);
    return out;
  }

  it("starts a role-play conversation with the scenario in the instructions", async () => {
    const mock = new MockProvider();
    setAiProviderForTests(mock);
    const user = await createLearner();
    const events = await collect(
      await startTutorTurn(user.id, {
        conversationId: null,
        mode: "explain",
        message: "Hi, can I have a tea, please?",
        style: "concise",
        lessonSlug: null,
        scenarioSlug: "a1-ordering-at-a-cafe",
      }),
    );
    const id = (events[0] as { id: string }).id;
    const conversation = await prisma.tutorConversation.findUniqueOrThrow({ where: { id } });
    expect(conversation).toMatchObject({
      mode: "conversation",
      scenarioSlug: "a1-ordering-at-a-cafe",
      title: "Role-play: Ordering at a café",
    });
    expect(mock.chatRequests[0].dynamicSystem).toContain("<role_play>");
    expect(mock.chatRequests[0].dynamicSystem).toContain("called Sam");

    // Later turns keep the scenario from the stored conversation.
    await collect(
      await startTutorTurn(user.id, {
        conversationId: id,
        mode: "conversation",
        message: "Small, please.",
        style: "concise",
        lessonSlug: null,
      }),
    );
    expect(mock.chatRequests[1].dynamicSystem).toContain("<role_play>");
  });

  it("refuses an unknown scenario before anything is stored", async () => {
    setAiProviderForTests(new MockProvider());
    const user = await createLearner();
    await expect(
      startTutorTurn(user.id, {
        conversationId: null,
        mode: "conversation",
        message: "Hello",
        style: "concise",
        lessonSlug: null,
        scenarioSlug: "no-such-scenario",
      }),
    ).rejects.toMatchObject({ kind: "bad_request" });
    expect(await prisma.tutorConversation.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.aiUsage.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("placement with listening", () => {
  it("stores a separate listening level and keeps the overall estimate from the other parts", async () => {
    const user = await createLearner();
    const rows = await prisma.exercise.findMany({ where: { phase: "placement" } });
    const correct = (r: (typeof rows)[number]) => (r.payload as { correct: string }).correct;
    const answers = rows.map((r) => ({
      exerciseId: r.id,
      // Right everywhere except listening, where everything is wrong.
      optionId: r.placementSection === "listening" ? null : correct(r),
    }));
    const { resultId, estimate } = await submitPlacement(user.id, answers);
    expect(estimate.listening).toMatchObject({ level: null, enoughEvidence: true });
    expect(estimate.overall).not.toBeNull();
    const row = await prisma.placementResult.findUniqueOrThrow({ where: { id: resultId } });
    expect(row.listeningLevel).toBeNull();
    expect(row.overallLevel).toBe(estimate.overall);

    const listeningRight = await submitPlacement(
      user.id,
      rows.filter((r) => r.placementSection === "listening").map((r) => ({ exerciseId: r.id, optionId: correct(r) })),
    );
    const second = await prisma.placementResult.findUniqueOrThrow({ where: { id: listeningRight.resultId } });
    expect(second.listeningLevel).toBe("B1");
    expect(second.overallLevel).toBeNull(); // listening alone never sets a starting level
  });
});
