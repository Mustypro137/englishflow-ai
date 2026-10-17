import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { recommend } from "@/lib/learning/recommend/engine";
import { getCalendar, getChallenges, getDashboard, getLearnerSnapshot } from "@/server/db/activity";
import { submitChallengeWriting } from "@/server/db/challenges";
import { prisma } from "@/server/db/client";
import { getLessonBySlug } from "@/server/db/curriculum";
import { recordAttempt } from "@/server/db/learning-records";
import { completeOnboarding } from "@/server/db/learner-profile";
import { endSession, getCurrentSession, setBlockDone, startSession } from "@/server/db/sessions";

const testUsers = { email: { endsWith: "@activity.example.test" } };
const LESSON = "a1-subject-pronouns-and-be";

async function createLearner(goals: string[] = []) {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@activity.example.test`, emailVerified: true },
  });
  await completeOnboarding(user.id, {
    displayName: "Learner",
    goals,
    nativeLanguage: null,
    selfReportedLevel: "unsure",
    dailyMinutes: 20,
    explanationStyle: "concise",
    timezone: "UTC",
  });
  return user;
}

/** A well-formed (not necessarily correct) answer for any exercise type. */
function anyResponse(ex: ClientExercise) {
  return ex.type === "multiple_choice"
    ? { optionId: ex.options[0].id }
    : ex.type === "gap_fill"
      ? { answers: ex.segments.slice(1).map(() => "x") }
      : ex.type === "word_order"
        ? { tokens: ex.tokens }
        : ex.type === "matching"
          ? { matches: ex.right }
          : { answer: "x" };
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("dashboard and snapshot", () => {
  it("shows an honest empty state for a new learner", async () => {
    const user = await createLearner();
    const d = await getDashboard(user.id);
    expect(d.hasActivity).toBe(false);
    expect(d.week).toHaveLength(7);
    expect(d.week.every((w) => w.count === 0)).toBe(true);
    expect(d.streak).toBe(0);
    expect(d.achievements).toEqual([]);
    expect(d.challenges).toHaveLength(3);
    expect(d.challenges.every((c) => c.completedAt === null)).toBe(true);
    const recs = recommend(d.snapshot);
    expect(recs[0]).toMatchObject({ kind: "lesson", href: `/app/learn/${LESSON}` });
  });

  it("reflects real answers: counts, achievements, reviews and challenge progress", async () => {
    const user = await createLearner();
    const lesson = (await getLessonBySlug(LESSON))!;
    const ex = lesson.exercises.guided[0];
    await recordAttempt(user.id, { exerciseId: ex.id, response: anyResponse(ex), hintsUsed: 0, revealedAnswer: false });

    const d = await getDashboard(user.id);
    expect(d.hasActivity).toBe(true);
    expect(d.week.at(-1)!.count).toBe(1);
    expect(d.daysThisWeek).toBe(1);
    expect(d.streak).toBe(1);
    expect(d.achievements.map((a) => a.id)).toEqual(["first-answer"]);
    expect(d.snapshot.lessons.find((l) => l.slug === LESSON)).toMatchObject({ answered: 1, completed: false });
    // The answered exercise is scheduled for review tomorrow, not now.
    expect(d.snapshot.reviewsDue).toBe(0);
    const tomorrow = await getCalendar(user.id, { year: 2026, month: 1 });
    expect(tomorrow.reviewLoad[1].count).toBe(1);
  });

  it("practice answers never complete a lesson, but are recorded as mixed practice", async () => {
    const user = await createLearner();
    const lesson = (await getLessonBySlug(LESSON))!;
    const all = [...lesson.exercises.guided, ...lesson.exercises.independent, ...lesson.exercises.recall];
    for (const ex of all) {
      await recordAttempt(
        user.id,
        { exerciseId: ex.id, response: anyResponse(ex), hintsUsed: 0, revealedAnswer: false },
        "practice",
      );
    }
    const s = await getLearnerSnapshot(user.id);
    expect(s.lessons.find((l) => l.slug === LESSON)).toMatchObject({ answered: 0, completed: false });
    expect(s.lastMixedPracticeAt).not.toBeNull();
    expect(await prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } })).toBe(0);
  }, 180_000);
});

describe("study sessions", () => {
  it("saves the plan, tracks blocks and completes when all are done", async () => {
    const user = await createLearner();
    const session = await startSession(user.id, 30);
    expect(session.plannedMinutes).toBe(30);
    expect(session.plan.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(30);
    expect((await getCurrentSession(user.id))?.id).toBe(session.id);

    const [first, ...rest] = session.plan.blocks;
    const after = await setBlockDone(user.id, session.id, first.id, true);
    expect(after?.completedBlocks).toEqual([first.id]);
    expect(after?.completedAt).toBeNull();
    expect(await setBlockDone(user.id, session.id, "not-a-block", true)).toBeNull();

    let last = after;
    for (const b of rest) last = await setBlockDone(user.id, session.id, b.id, true);
    expect(last?.completedAt).not.toBeNull();
  });

  it("can't be read or changed by another learner", async () => {
    const a = await createLearner();
    const b = await createLearner();
    const session = await startSession(a.id, 10);
    expect(await setBlockDone(b.id, session.id, session.plan.blocks[0].id, true)).toBeNull();
    expect(await endSession(b.id, session.id)).toBe(false);
    expect(await getCurrentSession(b.id)).toBeNull();
    expect(await endSession(a.id, session.id)).toBe(true);
  });
});

describe("challenges", () => {
  it("completes the writing challenge only with enough real sentences, and keeps it completed", async () => {
    const user = await createLearner();
    const short = await submitChallengeWriting(user.id, "daily-five-sentences", "I am Ada. Hi.");
    expect(short).toMatchObject({ ok: true, sentences: 1, completed: false });

    const text = "I am a nurse. My sister is a teacher. We live in Lagos. Our flat is small. I am happy here.";
    const full = await submitChallengeWriting(user.id, "daily-five-sentences", text);
    expect(full).toMatchObject({ ok: true, sentences: 5, completed: true });

    const edited = await submitChallengeWriting(user.id, "daily-five-sentences", "I changed it.");
    expect(edited).toMatchObject({ ok: true, completed: true });

    const views = await getChallenges(user.id);
    const writing = views.find((v) => v.challenge.slug === "daily-five-sentences")!;
    expect(writing.completedAt).not.toBeNull();
    expect(writing.text).toBe("I changed it.");
    expect((await getDashboard(user.id)).achievements.map((a) => a.id)).toContain("first-challenge");
  });

  it("rejects challenges that aren't open, and keeps writing private to its author", async () => {
    const a = await createLearner();
    const b = await createLearner();
    expect(await submitChallengeWriting(a.id, "weekly-four-days", "Some text here.")).toMatchObject({ ok: false });
    expect(await submitChallengeWriting(a.id, "nope", "Some text here.")).toMatchObject({ ok: false });
    await submitChallengeWriting(a.id, "daily-five-sentences", "My private sentence is here.");
    const bViews = await getChallenges(b.id);
    expect(bViews.find((v) => v.challenge.slug === "daily-five-sentences")?.text).toBeNull();
  });
});
