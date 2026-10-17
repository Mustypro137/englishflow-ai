import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AiError } from "@/lib/ai/errors";
import { suggestMemories } from "@/server/ai/memory";
import { setAiProviderForTests } from "@/server/ai/provider";
import { startTutorTurn } from "@/server/ai/tutor";
import type { AiProvider } from "@/server/ai/types";
import { requestWritingFeedback } from "@/server/ai/writing";
import { prisma } from "@/server/db/client";
import { getPlacementResult } from "@/server/db/learning-records";
import { confirmMemory, deleteMemory, updateMemory } from "@/server/db/memory";
import { deleteMistake } from "@/server/db/mistakes";
import { deleteFlashcard, deleteNote, updateFlashcard, updateNote } from "@/server/db/notebook";
import { endSession, setBlockDone } from "@/server/db/sessions";
import { deleteConversation, getConversation } from "@/server/db/tutor";
import { deleteDraft, getDraft, saveDraftFeedback } from "@/server/db/writing";

/*
 * Authorization sweep: every server function that takes a record id is called by a second
 * learner with the first learner's ids. Each must refuse, and the first learner's records
 * must be unchanged afterwards.
 */

const testUsers = { email: { endsWith: "@authz.example.test" } };

/** A configured provider that fails the test if any request reaches the model. */
const noCallsProvider: AiProvider = {
  name: "mock",
  isConfigured: () => true,
  async *chat() {
    throw new Error("the model must not be called for another learner's records");
  },
  async generateStructured() {
    throw new Error("the model must not be called for another learner's records");
  },
};

const newUser = () =>
  prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@authz.example.test`, emailVerified: true },
  });

let owner: string;
let intruder: string;
const ids = {} as Record<
  "flashcard" | "note" | "mistake" | "session" | "memory" | "conversation" | "draft" | "placement",
  string
>;

beforeAll(async () => {
  owner = (await newUser()).id;
  intruder = (await newUser()).id;
  const exercise = await prisma.exercise.findFirstOrThrow({ where: { source: "seed" } });

  ids.flashcard = (await prisma.flashcard.create({ data: { userId: owner, front: "hello", back: "hola" } })).id;
  ids.note = (await prisma.note.create({ data: { userId: owner, kind: "grammar_note", body: "mine" } })).id;
  ids.mistake = (
    await prisma.mistakeRecord.create({
      data: {
        userId: owner,
        exerciseId: exercise.id,
        context: "lesson",
        originalAnswer: "a",
        correctAnswer: "b",
        explanation: "x",
      },
    })
  ).id;
  ids.session = (
    await prisma.studySession.create({
      data: {
        userId: owner,
        plannedMinutes: 10,
        plan: {
          minutes: 10,
          blocks: [{ id: "b1", kind: "review", minutes: 10, title: "Review", href: "/app/review" }],
        },
        completedBlocks: [],
      },
    })
  ).id;
  ids.memory = (
    await prisma.learnerMemory.create({ data: { userId: owner, kind: "goal", content: "Pass B1", source: "ai" } })
  ).id;
  ids.conversation = (
    await prisma.tutorConversation.create({
      data: {
        userId: owner,
        mode: "explain",
        title: "Mine",
        messages: { create: [{ role: "user", content: "private question" }] },
      },
    })
  ).id;
  ids.draft = (
    await prisma.writingDraft.create({ data: { userId: owner, kind: "journal", text: "my diary", wordCount: 2 } })
  ).id;
  ids.placement = (await prisma.placementResult.create({ data: { userId: owner, overallLevel: "A1", scores: {} } })).id;

  setAiProviderForTests(noCallsProvider);
});

afterAll(async () => {
  setAiProviderForTests(null);
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("another learner's ids", () => {
  it("can't be read", async () => {
    expect(await getConversation(intruder, ids.conversation)).toBeNull();
    expect(await getDraft(intruder, ids.draft)).toBeNull();
    expect(await getPlacementResult(intruder, ids.placement)).toBeNull();
  });

  it("can't be changed", async () => {
    expect(await updateFlashcard(intruder, ids.flashcard, { front: "x", back: "y", note: null })).toBe(false);
    expect(await updateNote(intruder, ids.note, { kind: "grammar_note", body: "x", lessonSlug: null })).toBe(false);
    expect(await setBlockDone(intruder, ids.session, "b1", true)).toBeNull();
    expect(await endSession(intruder, ids.session)).toBe(false);
    expect(await updateMemory(intruder, ids.memory, { kind: "goal", content: "x" })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await confirmMemory(intruder, ids.memory)).toBe(false);
    const feedback = {
      version: 1 as const,
      correctness: [],
      naturalness: [],
      style: null,
      correctedText: null,
      meaningCheck: "x",
      summary: "x",
      nextStep: "x",
      dropped: 0,
    };
    expect(await saveDraftFeedback(intruder, ids.draft, feedback)).toBe(false);
  });

  it("can't be deleted", async () => {
    expect(await deleteFlashcard(intruder, ids.flashcard)).toBe(false);
    expect(await deleteNote(intruder, ids.note)).toBe(false);
    expect(await deleteMistake(intruder, ids.mistake)).toBe(false);
    expect(await deleteMemory(intruder, ids.memory)).toBe(false);
    expect(await deleteConversation(intruder, ids.conversation)).toBe(false);
    expect(await deleteDraft(intruder, ids.draft)).toBe(false);
  });

  it("can't be sent to the AI", async () => {
    const refused = { kind: "bad_request" };
    await expect(
      startTutorTurn(intruder, {
        conversationId: ids.conversation,
        mode: "explain",
        message: "show me",
        style: "concise",
        lessonSlug: null,
      }),
    ).rejects.toMatchObject(refused);
    await expect(suggestMemories(intruder, ids.conversation)).rejects.toBeInstanceOf(AiError);
    await expect(requestWritingFeedback(intruder, ids.draft, { style: false })).rejects.toMatchObject(refused);
    // Refused before any usage was reserved.
    expect(await prisma.aiUsage.count({ where: { userId: intruder } })).toBe(0);
  });

  it("leave the owner's records exactly as they were", async () => {
    expect(await prisma.flashcard.findUnique({ where: { id: ids.flashcard } })).toMatchObject({ front: "hello" });
    expect(await prisma.note.findUnique({ where: { id: ids.note } })).toMatchObject({ body: "mine" });
    expect(await prisma.mistakeRecord.findUnique({ where: { id: ids.mistake } })).not.toBeNull();
    expect(await prisma.studySession.findUnique({ where: { id: ids.session } })).toMatchObject({
      completedBlocks: [],
      completedAt: null,
    });
    expect(await prisma.learnerMemory.findUnique({ where: { id: ids.memory } })).toMatchObject({
      content: "Pass B1",
      verified: false,
    });
    expect(await prisma.tutorMessage.count({ where: { conversationId: ids.conversation } })).toBe(1);
    expect(await prisma.writingDraft.findUnique({ where: { id: ids.draft } })).toMatchObject({ feedback: null });
  });
});
