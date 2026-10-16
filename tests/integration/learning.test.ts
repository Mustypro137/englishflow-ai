import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateContent } from "@content/validate";
import { seedCurriculum } from "@/server/content/seed-curriculum";
import { prisma } from "@/server/db/client";
import { getCurriculumOverview, getLessonBySlug, getPlacementQuestions } from "@/server/db/curriculum";
import {
  chooseStartingLevel,
  getCurriculumProgress,
  getLessonHistory,
  InvalidResponseError,
  recordAttempt,
  recordLessonView,
  submitPlacement,
} from "@/server/db/learning-records";
import { completeOnboarding } from "@/server/db/learner-profile";

const content = validateContent();
const testUsers = { email: { endsWith: "@example.test" } };
const LESSON = "a1-subject-pronouns-and-be";

async function createLearner() {
  const user = await prisma.user.create({
    data: { id: randomUUID(), name: "Learner", email: `${randomUUID()}@example.test`, emailVerified: true },
  });
  await completeOnboarding(user.id, {
    displayName: "Learner",
    goals: [],
    nativeLanguage: null,
    selfReportedLevel: "unsure",
    dailyMinutes: 20,
    explanationStyle: "concise",
    timezone: "UTC",
  });
  return user;
}

/** The correct option id for a multiple-choice exercise, read from the content files. */
function correctOption(slug: string) {
  const all = [
    ...content.placement.map((p) => p.exercise),
    ...content.levels.flatMap((l) =>
      l.modules.flatMap((m) =>
        m.units.flatMap((u) =>
          u.lessons.flatMap((ls) => (ls.status === "published" ? [...ls.guided, ...ls.independent, ...ls.recall] : [])),
        ),
      ),
    ),
  ];
  const e = all.find((x) => x.slug === slug);
  if (e?.type !== "multiple_choice") throw new Error(`${slug} is not multiple choice`);
  return e.payload.correct;
}

async function exerciseId(slug: string) {
  return (await prisma.exercise.findUniqueOrThrow({ where: { slug } })).id;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await seedCurriculum(prisma, content);
}, 180_000);

afterAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("curriculum seed", () => {
  it("is idempotent: seeding again changes no counts", async () => {
    const count = async () => ({
      lessons: await prisma.lesson.count(),
      exercises: await prisma.exercise.count(),
      concepts: await prisma.concept.count(),
      prereqs: await prisma.conceptPrerequisite.count(),
      links: await prisma.exerciseConcept.count(),
    });
    const before = await count();
    const summary = await seedCurriculum(prisma, content);
    expect(await count()).toEqual(before);
    expect(summary).toMatchObject({ publishedLessons: 8, exercises: 81, placementItems: 30, archived: 0 });
  }, 180_000);
});

describe("curriculum reads", () => {
  it("lists all six levels with published and planned lessons in order", async () => {
    const overview = await getCurriculumOverview();
    expect(overview.map((l) => l.code)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    const a1Lessons = overview[0].modules.flatMap((m) => m.units.flatMap((u) => u.lessons));
    expect(a1Lessons[0].slug).toBe(LESSON);
    expect(a1Lessons.filter((l) => l.status === "published")).toHaveLength(8);
  });

  it("returns a published lesson with no answers in the browser data", async () => {
    const lesson = await getLessonBySlug(LESSON);
    expect(lesson).not.toBeNull();
    expect(lesson!.exercises.guided.length).toBeGreaterThanOrEqual(3);
    const json = JSON.stringify(lesson!.exercises);
    for (const leak of ['"accepted"', '"correct"', '"optionFeedback"', '"explanation"', '"pairs"']) {
      expect(json).not.toContain(leak);
    }
  });

  it("does not open planned or unknown lessons", async () => {
    expect(await getLessonBySlug("a1-can-ability")).toBeNull();
    expect(await getLessonBySlug("does-not-exist")).toBeNull();
  });

  it("returns placement questions without their levels", async () => {
    const qs = await getPlacementQuestions();
    expect(qs).toHaveLength(30);
    expect(qs.map((q) => q.section).slice(0, 1)).toEqual(["grammar"]);
    expect(JSON.stringify(qs)).not.toMatch(/"(level|placementLevel|correct)"/);
  });
});

describe("recording practice", () => {
  it("counts a lesson view as exposure only", async () => {
    const user = await createLearner();
    await recordLessonView(user.id, LESSON);
    await recordLessonView(user.id, LESSON);
    const progress = await prisma.conceptProgress.findMany({ where: { userId: user.id } });
    expect(progress.length).toBeGreaterThan(0);
    for (const p of progress) expect(p).toMatchObject({ exposures: 2, attempts: 0, masteryState: "new" });
    const lp = await prisma.lessonProgress.findFirstOrThrow({ where: { userId: user.id } });
    expect(lp.viewCount).toBe(2);
  });

  it("grades on the server, stores the attempt and updates concept progress", async () => {
    const user = await createLearner();
    const id = await exerciseId("a1-be-g1");

    const wrong = await recordAttempt(user.id, {
      exerciseId: id,
      response: { optionId: "a" },
      hintsUsed: 0,
      revealedAnswer: false,
    });
    expect(wrong.result).toMatchObject({ correct: false, feedback: "Am is only for I.", correctAnswer: "is" });

    const right = await recordAttempt(user.id, {
      exerciseId: id,
      response: { optionId: correctOption("a1-be-g1") },
      hintsUsed: 1,
      revealedAnswer: false,
    });
    expect(right.result.correct).toBe(true);
    expect(right.progress).toMatchObject({ answered: 1, correctFirstTry: 0, completed: false });

    const attempts = await prisma.exerciseAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(attempts.map((a) => [a.isCorrect, a.independent])).toEqual([
      [false, true],
      [true, false],
    ]);
    const concept = await prisma.conceptProgress.findFirstOrThrow({
      where: { userId: user.id, concept: { slug: "be-present-positive" } },
    });
    expect(concept).toMatchObject({ attempts: 2, correct: 1, independentCorrect: 0, masteryState: "learning" });

    const history = await getLessonHistory(user.id, (await getLessonBySlug(LESSON))!.id);
    expect(history.byExercise[id]).toEqual({ attempts: 2, lastCorrect: true, everCorrect: true });
  });

  it("rejects invalid responses and placement items in lesson context", async () => {
    const user = await createLearner();
    const id = await exerciseId("a1-be-g1");
    await expect(
      recordAttempt(user.id, { exerciseId: id, response: { optionId: "zzz" }, hintsUsed: 0, revealedAnswer: false }),
    ).rejects.toThrow(InvalidResponseError);
    const placementId = await exerciseId("placement-g-a1-1");
    await expect(
      recordAttempt(user.id, {
        exerciseId: placementId,
        response: { optionId: "c" },
        hintsUsed: 0,
        revealedAnswer: false,
      }),
    ).rejects.toThrow(InvalidResponseError);
    expect(await prisma.exerciseAttempt.count({ where: { userId: user.id } })).toBe(0);
  });

  it("marks a lesson complete once every exercise has been answered", async () => {
    const user = await createLearner();
    const lesson = (await getLessonBySlug(LESSON))!;
    const all = [...lesson.exercises.guided, ...lesson.exercises.independent, ...lesson.exercises.recall];
    let last;
    for (const ex of all) {
      // Any well-formed answer counts as answered; correctness doesn't matter for completion.
      const response =
        ex.type === "multiple_choice"
          ? { optionId: ex.options[0].id }
          : ex.type === "gap_fill"
            ? { answers: ex.segments.slice(1).map(() => "x") }
            : ex.type === "word_order"
              ? { tokens: ex.tokens }
              : ex.type === "matching"
                ? { matches: ex.right }
                : { answer: "x" };
      last = await recordAttempt(user.id, { exerciseId: ex.id, response, hintsUsed: 0, revealedAnswer: false });
    }
    expect(last!.progress).toMatchObject({ answered: all.length, total: all.length, completed: true });
    const progress = await getCurriculumProgress(user.id);
    expect(progress[lesson.id]).toMatchObject({ completed: true, answered: all.length });
  });

  it("keeps each learner's records separate", async () => {
    const a = await createLearner();
    const b = await createLearner();
    const id = await exerciseId("a1-be-g1");
    await recordLessonView(a.id, LESSON);
    await recordAttempt(a.id, { exerciseId: id, response: { optionId: "b" }, hintsUsed: 0, revealedAnswer: false });

    expect(await prisma.exerciseAttempt.count({ where: { userId: b.id } })).toBe(0);
    expect(await prisma.conceptProgress.count({ where: { userId: b.id } })).toBe(0);
    expect(await getCurriculumProgress(b.id)).toEqual({});
    const lessonId = (await getLessonBySlug(LESSON))!.id;
    expect((await getLessonHistory(b.id, lessonId)).summary.answered).toBe(0);
  });
});

describe("placement", () => {
  it("estimates levels, stores attempts without touching concept progress, and applies the chosen level", async () => {
    const user = await createLearner();
    const qs = await getPlacementQuestions();
    const answers = await Promise.all(
      qs.map(async (q) => {
        const row = await prisma.exercise.findUniqueOrThrow({ where: { id: q.exercise.id } });
        return { exerciseId: q.exercise.id, optionId: correctOption(row.slug) };
      }),
    );
    const outcome = await submitPlacement(user.id, answers);
    expect(outcome.estimate.sections.map((s) => [s.section, s.level, s.atCeiling])).toEqual([
      ["grammar", "C2", true],
      ["vocabulary", "C2", true],
      ["reading", "B2", true],
    ]);
    expect(outcome.estimate.overall).toBe("C2");
    expect(await prisma.exerciseAttempt.count({ where: { userId: user.id, context: "placement" } })).toBe(30);
    expect(await prisma.conceptProgress.count({ where: { userId: user.id } })).toBe(0);

    await chooseStartingLevel(user.id, outcome.resultId, "C2");
    expect(await prisma.profile.findUnique({ where: { userId: user.id } })).toMatchObject({
      estimatedLevel: "C2",
      levelSource: "placement",
    });

    await chooseStartingLevel(user.id, outcome.resultId, "B1");
    expect(await prisma.profile.findUnique({ where: { userId: user.id } })).toMatchObject({
      estimatedLevel: "B1",
      levelSource: "self_reported",
    });
  });

  it("treats 'I don't know' as incorrect and counts accepting A1 as following the placement", async () => {
    const user = await createLearner();
    const qs = await getPlacementQuestions();
    const outcome = await submitPlacement(
      user.id,
      qs.map((q) => ({ exerciseId: q.exercise.id, optionId: null })),
    );
    expect(outcome.estimate).toMatchObject({ overall: null, enoughEvidence: true });
    await chooseStartingLevel(user.id, outcome.resultId, "A1");
    expect(await prisma.profile.findUnique({ where: { userId: user.id } })).toMatchObject({
      estimatedLevel: "A1",
      levelSource: "placement",
    });
  });

  it("leaves a skipped section unassessed", async () => {
    const user = await createLearner();
    const qs = (await getPlacementQuestions()).filter((q) => q.section !== "reading");
    const outcome = await submitPlacement(
      user.id,
      qs.map((q) => ({ exerciseId: q.exercise.id, optionId: null })),
    );
    expect(outcome.estimate.sections.find((s) => s.section === "reading")).toMatchObject({
      answered: 0,
      enoughEvidence: false,
    });
  });

  it("cannot apply another learner's placement result", async () => {
    const a = await createLearner();
    const b = await createLearner();
    const qs = await getPlacementQuestions();
    const outcome = await submitPlacement(
      a.id,
      qs.map((q) => ({ exerciseId: q.exercise.id, optionId: "a" })),
    );
    await chooseStartingLevel(b.id, outcome.resultId, "B2");
    const resultRow = await prisma.placementResult.findUniqueOrThrow({ where: { id: outcome.resultId } });
    expect(resultRow.chosenLevel).toBeNull();
    // B's own profile changes (their own choice), but it is not labelled as a placement result.
    expect(await prisma.profile.findUnique({ where: { userId: b.id } })).toMatchObject({
      levelSource: "self_reported",
    });
  });
});
