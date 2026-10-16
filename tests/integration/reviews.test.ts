import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { recordAttempt } from "@/server/db/learning-records";
import { completeOnboarding } from "@/server/db/learner-profile";
import { listMistakes, deleteMistake } from "@/server/db/mistakes";
import {
  createFlashcard,
  createNote,
  deleteFlashcard,
  deleteNote,
  listBookmarks,
  listFlashcards,
  listNotes,
  toggleBookmark,
  updateFlashcard,
  updateNote,
} from "@/server/db/notebook";
import { answerReview, getDueQueue, getReviewOverview } from "@/server/db/reviews";
import { getSavedWords, removeSavedWord, saveWord } from "@/server/db/vocabulary";

const testUsers = { email: { endsWith: "@reviews.example.test" } };
const DAY = 86_400_000;
const MIN = 60_000;

async function createLearner(timezone = "Africa/Lagos") {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@reviews.example.test`, emailVerified: true },
  });
  await completeOnboarding(user.id, {
    displayName: "Learner",
    goals: [],
    nativeLanguage: null,
    selfReportedLevel: "unsure",
    dailyMinutes: 20,
    explanationStyle: "concise",
    timezone,
  });
  return user;
}

const exerciseId = async (slug: string) => (await prisma.exercise.findUniqueOrThrow({ where: { slug } })).id;
const entryId = async (slug: string) => (await prisma.vocabularyEntry.findUniqueOrThrow({ where: { slug } })).id;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  // The curriculum is loaded once by global-setup.ts.
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("exercise reviews", () => {
  it("schedules a lesson exercise for a delayed review tomorrow, and records the mistake", async () => {
    const user = await createLearner();
    const id = await exerciseId("a1-be-g1");
    await recordAttempt(user.id, { exerciseId: id, response: { optionId: "a" }, hintsUsed: 0, revealedAnswer: false });

    const item = await prisma.reviewItem.findFirstOrThrow({ where: { userId: user.id, exerciseId: id } });
    const hoursUntilDue = (item.dueAt.getTime() - Date.now()) / 3_600_000;
    expect(hoursUntilDue).toBeGreaterThan(23);
    expect(hoursUntilDue).toBeLessThanOrEqual(24);
    expect(await getDueQueue(user.id)).toEqual([]);

    const mistakes = await listMistakes(user.id);
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toMatchObject({
      originalAnswer: "am",
      correctAnswer: "is",
      resolvedAt: null,
      context: "lesson",
      conceptName: expect.any(String),
    });
  });

  it("asks the exercise again the next day (without answers) and reschedules after a correct answer", async () => {
    const user = await createLearner();
    const id = await exerciseId("a1-be-g1");
    await recordAttempt(user.id, { exerciseId: id, response: { optionId: "a" }, hintsUsed: 0, revealedAnswer: false });

    const tomorrow = new Date(Date.now() + DAY + MIN);
    const queue = await getDueQueue(user.id, tomorrow);
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("exercise");
    expect(JSON.stringify(queue)).not.toMatch(/"(correct|accepted|explanation|optionFeedback)"/);

    const res = await answerReview(user.id, { reviewItemId: queue[0].id, response: { optionId: "b" } }, tomorrow);
    expect(res).toMatchObject({ rating: "good", correct: true, nextDueLabel: "tomorrow" });

    // The earlier mistake is now resolved.
    const [mistake] = await listMistakes(user.id);
    expect(mistake).toMatchObject({ laterAttempts: 1, laterCorrect: 1 });
    expect(mistake.resolvedAt).not.toBeNull();
    expect(await prisma.exerciseAttempt.count({ where: { userId: user.id, context: "review" } })).toBe(1);
    expect(await prisma.reviewLog.count({ where: { userId: user.id } })).toBe(1);
  });

  it("a wrong review answer brings the item back within minutes and records a new mistake", async () => {
    const user = await createLearner();
    const id = await exerciseId("a1-be-g1");
    await recordAttempt(user.id, { exerciseId: id, response: { optionId: "b" }, hintsUsed: 0, revealedAnswer: false });
    const day2 = new Date(Date.now() + DAY + MIN);
    const [card] = await getDueQueue(user.id, day2);
    const good = await answerReview(user.id, { reviewItemId: card.id, response: { optionId: "b" } }, day2);
    const day3 = new Date(good.nextDueAt.getTime() + MIN);
    const [again] = await getDueQueue(user.id, day3);
    const wrong = await answerReview(user.id, { reviewItemId: again.id, response: { optionId: "c" } }, day3);
    expect(wrong).toMatchObject({ rating: "again", correct: false, nextDueLabel: "in 10 min" });
    const item = await prisma.reviewItem.findFirstOrThrow({ where: { userId: user.id, exerciseId: id } });
    expect(item).toMatchObject({ state: "relearning", lapses: 1 });
    expect((await listMistakes(user.id)).filter((m) => m.resolvedAt === null)).toHaveLength(1);
  });

  it("awards mastered only after correct independent reviews on two separate days", async () => {
    const user = await createLearner();
    const lessonSlugs = ["a1-be-g3", "a1-be-r2"]; // both practise be-present-positive
    for (const slug of lessonSlugs) {
      const id = await exerciseId(slug);
      await recordAttempt(user.id, {
        exerciseId: id,
        response: slug === "a1-be-g3" ? { answers: ["are"] } : { answers: ["It"] },
        hintsUsed: 0,
        revealedAnswer: false,
      });
    }
    // A third correct practice answer so practice evidence is strong.
    await recordAttempt(user.id, {
      exerciseId: await exerciseId("a1-be-r1"),
      response: { answer: "am" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    const concept = () =>
      prisma.conceptProgress.findFirstOrThrow({ where: { userId: user.id, concept: { slug: "be-present-positive" } } });
    expect((await concept()).masteryState).not.toBe("mastered");

    // Day 2: review the first exercise correctly.
    const day2 = new Date(Date.now() + DAY + 5 * MIN);
    const q2 = await getDueQueue(user.id, day2);
    const g3 = q2.find(
      (c) => c.kind === "exercise" && c.exercise.type === "gap_fill" && c.exercise.segments[0] === "We ",
    )!;
    await answerReview(user.id, { reviewItemId: g3.id, response: { answers: ["are"] } }, day2);
    expect((await concept()).masteryState).not.toBe("mastered");

    // Day 4: review the second exercise correctly → second separate day.
    const day4 = new Date(Date.now() + 3 * DAY + 5 * MIN);
    const q4 = await getDueQueue(user.id, day4);
    const r2 = q4.find(
      (c) => c.kind === "exercise" && c.exercise.type === "gap_fill" && c.exercise.segments[0] === "",
    )!;
    await answerReview(user.id, { reviewItemId: r2.id, response: { answers: ["It"] } }, day4);
    expect(await concept()).toMatchObject({ masteryState: "mastered", reviewCorrectDays: 2 });
  });
});

describe("saved words", () => {
  it("saves a word, reviews it in both directions, and removes it with its schedule", async () => {
    const user = await createLearner();
    const id = await entryId("a1-aunt");
    expect(await saveWord(user.id, id)).toBe(true);
    expect(await saveWord(user.id, id)).toBe(true); // idempotent
    expect(await prisma.reviewItem.count({ where: { userId: user.id } })).toBe(1);

    const [recall] = await getDueQueue(user.id);
    expect(recall.kind).toBe("word_recall");
    expect(JSON.stringify(recall)).not.toContain('"aunt"');
    const wrong = await answerReview(user.id, { reviewItemId: recall.id, response: { answer: "uncle" } });
    expect(wrong).toMatchObject({ correct: false, rating: "again", answer: "aunt" });

    const later = new Date(Date.now() + 11 * MIN);
    const [recognise] = await getDueQueue(user.id, later);
    expect(recognise.kind).toBe("word_recognise");
    const rated = await answerReview(user.id, { reviewItemId: recognise.id, rating: "good" }, later);
    expect(rated.rating).toBe("good");

    const words = await getSavedWords(user.id, "Africa/Lagos", later);
    expect(words.map((w) => w.headword)).toEqual(["aunt"]);
    await removeSavedWord(user.id, id);
    expect(await getSavedWords(user.id, "UTC")).toEqual([]);
    expect(await prisma.reviewItem.count({ where: { userId: user.id } })).toBe(0);
  });

  it("requires a rating for self-rated cards and rejects other learners' items", async () => {
    const a = await createLearner();
    const b = await createLearner();
    await saveWord(a.id, await entryId("a1-key"));
    const [card] = await getDueQueue(a.id);
    await expect(answerReview(b.id, { reviewItemId: card.id, response: { answer: "key" } })).rejects.toThrow();
    const item = await prisma.reviewItem.findUniqueOrThrow({ where: { id: card.id } });
    expect(item.reps).toBe(0);
  });
});

describe("notebook", () => {
  it("creates, edits and deletes flashcards; new cards are due straight away", async () => {
    const user = await createLearner();
    const id = await createFlashcard(user.id, { front: "kitchen", back: "the room where you cook", note: null });
    expect((await listFlashcards(user.id, "UTC"))[0]).toMatchObject({ front: "kitchen", dueLabel: "now" });
    const [card] = await getDueQueue(user.id);
    expect(card).toMatchObject({ kind: "flashcard", front: "kitchen" });
    // The card's id is the review item's id, so rating it works.
    const rated = await answerReview(user.id, { reviewItemId: card.id, rating: "good" });
    expect(rated).toMatchObject({ rating: "good", nextDueLabel: "tomorrow" });

    expect(
      await updateFlashcard(user.id, id, { front: "bedroom", back: "the room where you sleep", note: "UK & US" }),
    ).toBe(true);
    expect((await listFlashcards(user.id, "UTC"))[0]).toMatchObject({ front: "bedroom", note: "UK & US" });
    expect(await deleteFlashcard(user.id, id)).toBe(true);
    expect(await prisma.reviewItem.count({ where: { userId: user.id } })).toBe(0);
  });

  it("notes and bookmarks work, and another learner cannot touch them", async () => {
    const a = await createLearner();
    const b = await createLearner();
    const noteId = await createNote(a.id, {
      kind: "grammar_note",
      body: "he/she/it + -s",
      lessonSlug: "a1-present-simple-he-she-it",
    });
    const cardId = await createFlashcard(a.id, { front: "front", back: "back", note: null });

    expect(await updateNote(b.id, noteId, { kind: "saved_sentence", body: "hacked", lessonSlug: null })).toBe(false);
    expect(await deleteNote(b.id, noteId)).toBe(false);
    expect(await updateFlashcard(b.id, cardId, { front: "x", back: "y", note: null })).toBe(false);
    expect(await deleteFlashcard(b.id, cardId)).toBe(false);
    expect(await listNotes(b.id)).toEqual([]);
    expect(await listFlashcards(b.id, "UTC")).toEqual([]);

    const notes = await listNotes(a.id);
    expect(notes[0]).toMatchObject({ body: "he/she/it + -s", lesson: { slug: "a1-present-simple-he-she-it" } });

    expect(await toggleBookmark(a.id, "a1-a-and-an")).toBe(true);
    expect((await listBookmarks(a.id)).map((l) => l.slug)).toEqual(["a1-a-and-an"]);
    expect(await toggleBookmark(a.id, "a1-a-and-an")).toBe(false);
    expect(await listBookmarks(a.id)).toEqual([]);
    expect(await toggleBookmark(a.id, "a1-can-ability")).toBe(false); // planned lessons can't be bookmarked
  });

  it("lets learners delete only their own mistakes", async () => {
    const a = await createLearner();
    const b = await createLearner();
    await recordAttempt(a.id, {
      exerciseId: await exerciseId("a1-be-g1"),
      response: { optionId: "a" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    const [m] = await listMistakes(a.id);
    expect(await deleteMistake(b.id, m.id)).toBe(false);
    expect(await deleteMistake(a.id, m.id)).toBe(true);
    expect(await listMistakes(a.id)).toEqual([]);
  });
});

describe("review overview", () => {
  it("counts what is due now, later today and tomorrow in the learner's time zone", async () => {
    const user = await createLearner("Africa/Lagos");
    // 10:00 in Lagos (UTC+1)
    const now = new Date("2026-10-20T09:00:00Z");
    await createFlashcard(user.id, { front: "a", back: "b", note: null }, now); // due now
    const later = await createFlashcard(user.id, { front: "c", back: "d", note: null }, now);
    const tomorrow = await createFlashcard(user.id, { front: "e", back: "f", note: null }, now);
    await prisma.reviewItem.update({
      where: { flashcardId: later },
      data: { dueAt: new Date("2026-10-20T20:00:00Z") },
    });
    await prisma.reviewItem.update({
      where: { flashcardId: tomorrow },
      data: { dueAt: new Date("2026-10-20T23:30:00Z") },
    }); // 00:30 local, next day
    expect(await getReviewOverview(user.id, now)).toMatchObject({ dueNow: 1, laterToday: 1, tomorrow: 1, total: 3 });
  });
});
