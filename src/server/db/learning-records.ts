import "server-only";
import type { Cefr } from "@content/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { type GradeResult, gradeExercise, InvalidResponseError } from "@/lib/learning/grading/grade-exercise";
import { applyAttempt, applyExposure, EMPTY_PROGRESS } from "@/lib/learning/mastery";
import { estimatePlacement, type PlacementEstimate } from "@/lib/learning/placement";
import { cardAfterLesson } from "@/lib/learning/srs/scheduler";
import { prisma } from "./client";
import { getExercisesForGrading, getLessonExerciseIds } from "./curriculum";
import { trackAnswer } from "./mistakes";
import { loadProgressMap, saveProgress } from "./progress";

/*
 * Learner learning records. Every function takes the signed-in learner's userId
 * (from requireUser()) and scopes all reads and writes to it.
 */

export { InvalidResponseError };

type Tx = Prisma.TransactionClient;

/** Opening a lesson counts as exposure to its concepts — never as practice or mastery. */
export async function recordLessonView(userId: string, lessonSlug: string): Promise<void> {
  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, status: "published", archivedAt: null },
    include: { concepts: true },
  });
  if (!lesson) return;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { userId, lessonId: lesson.id },
      update: { lastViewedAt: now, viewCount: { increment: 1 } },
    });
    const conceptIds = lesson.concepts.map((c) => c.conceptId);
    const progress = await loadProgressMap(tx, userId, conceptIds);
    for (const conceptId of conceptIds) {
      await saveProgress(tx, userId, conceptId, applyExposure(progress.get(conceptId) ?? EMPTY_PROGRESS, now));
    }
  });
}

export interface LessonProgressSummary {
  answered: number;
  total: number;
  correctFirstTry: number;
  completed: boolean;
}

export interface AttemptOutcome {
  result: GradeResult;
  progress: LessonProgressSummary;
}

/** Grade a lesson exercise on the server, store the attempt and update concept progress. */
export async function recordAttempt(
  userId: string,
  input: { exerciseId: string; response: unknown; hintsUsed: number; revealedAnswer: boolean },
): Promise<AttemptOutcome> {
  const [record] = await getExercisesForGrading([input.exerciseId]);
  if (!record || !record.lessonId || record.phase === "placement") {
    throw new InvalidResponseError("This exercise is not part of a lesson.");
  }
  const result = gradeExercise(record.exercise, input.response);
  const independent = input.hintsUsed === 0 && !input.revealedAnswer;
  const now = new Date();
  const lessonId = record.lessonId;

  // Attempt, concept progress, the review schedule and mistakes are written together.
  await prisma.$transaction(async (tx) => {
    const byConcept = await loadProgressMap(tx, userId, record.conceptIds);
    await tx.exerciseAttempt.create({
      data: {
        userId,
        exerciseId: record.id,
        context: "lesson",
        response: input.response as Prisma.InputJsonValue,
        isCorrect: result.correct,
        score: result.score,
        hintsUsed: input.hintsUsed,
        revealedAnswer: input.revealedAnswer,
        independent,
      },
    });
    for (const conceptId of record.conceptIds) {
      const next = applyAttempt(
        byConcept.get(conceptId) ?? EMPTY_PROGRESS,
        { correct: result.correct, independent },
        now,
      );
      await saveProgress(tx, userId, conceptId, next);
    }
    // Practised in a lesson → comes back for a delayed review tomorrow (once per exercise).
    const card = cardAfterLesson(now);
    await tx.reviewItem.upsert({
      where: { userId_exerciseId: { userId, exerciseId: record.id } },
      create: { userId, itemType: "exercise", exerciseId: record.id, ...card },
      update: {},
    });
    await trackAnswer(
      tx,
      userId,
      {
        exerciseId: record.id,
        exercise: record.exercise,
        conceptIds: record.conceptIds,
        response: input.response,
        result,
        context: "lesson",
      },
      now,
    );
  });

  const progress = await lessonSummary(prisma, userId, lessonId);
  if (progress.completed) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, completedAt: now },
      update: {},
    });
    await prisma.lessonProgress.updateMany({
      where: { userId, lessonId, completedAt: null },
      data: { completedAt: now },
    });
  }
  return { result, progress };
}

async function lessonSummary(tx: Tx | typeof prisma, userId: string, lessonId: string): Promise<LessonProgressSummary> {
  const ids = await getLessonExerciseIds(lessonId);
  const attempts = await tx.exerciseAttempt.findMany({
    where: { userId, exerciseId: { in: ids }, context: "lesson" },
    orderBy: { createdAt: "asc" },
    select: { exerciseId: true, isCorrect: true },
  });
  const first = new Map<string, boolean>();
  for (const a of attempts) if (!first.has(a.exerciseId)) first.set(a.exerciseId, a.isCorrect);
  return {
    answered: first.size,
    total: ids.length,
    correctFirstTry: [...first.values()].filter(Boolean).length,
    completed: ids.length > 0 && first.size === ids.length,
  };
}

export interface ExerciseHistory {
  attempts: number;
  lastCorrect: boolean;
  everCorrect: boolean;
}

/** The learner's previous answers in a lesson, so progress survives a reload. */
export async function getLessonHistory(
  userId: string,
  lessonId: string,
): Promise<{ summary: LessonProgressSummary; byExercise: Record<string, ExerciseHistory> }> {
  const summary = await lessonSummary(prisma, userId, lessonId);
  const attempts = await prisma.exerciseAttempt.findMany({
    where: { userId, context: "lesson", exercise: { lessonId } },
    orderBy: { createdAt: "asc" },
    select: { exerciseId: true, isCorrect: true },
  });
  const byExercise: Record<string, ExerciseHistory> = {};
  for (const a of attempts) {
    const h = (byExercise[a.exerciseId] ??= { attempts: 0, lastCorrect: false, everCorrect: false });
    h.attempts += 1;
    h.lastCorrect = a.isCorrect;
    h.everCorrect ||= a.isCorrect;
  }
  return { summary, byExercise };
}

export interface LessonStatusForUser {
  viewed: boolean;
  completed: boolean;
  answered: number;
}

/** Per-lesson progress for the curriculum page, keyed by lesson id. */
export async function getCurriculumProgress(userId: string): Promise<Record<string, LessonStatusForUser>> {
  const [rows, answered] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId }, select: { lessonId: true, completedAt: true } }),
    prisma.exerciseAttempt.findMany({
      where: { userId, context: "lesson" },
      distinct: ["exerciseId"],
      select: { exercise: { select: { lessonId: true } } },
    }),
  ]);
  const out: Record<string, LessonStatusForUser> = {};
  for (const r of rows) out[r.lessonId] = { viewed: true, completed: r.completedAt !== null, answered: 0 };
  for (const a of answered) {
    const id = a.exercise.lessonId;
    if (!id) continue;
    (out[id] ??= { viewed: true, completed: false, answered: 0 }).answered += 1;
  }
  return out;
}

// --- Placement ---------------------------------------------------------------

export interface PlacementOutcome {
  resultId: string;
  estimate: PlacementEstimate;
}

/**
 * Grade a full placement check in one go. Placement does not change concept progress.
 * optionId null means "I don't know" and counts as incorrect (it discourages guessing).
 * Questions in a skipped section are simply not sent, so that section is "not assessed".
 */
export async function submitPlacement(
  userId: string,
  answers: { exerciseId: string; optionId: string | null }[],
): Promise<PlacementOutcome> {
  const records = await getExercisesForGrading(answers.map((a) => a.exerciseId));
  const byId = new Map(records.map((r) => [r.id, r]));

  const graded = answers.flatMap((a) => {
    const rec = byId.get(a.exerciseId);
    if (!rec || rec.phase !== "placement" || !rec.placementSection || !rec.placementLevel) return [];
    const section = rec.placementSection;
    if (section !== "grammar" && section !== "vocabulary" && section !== "reading") return [];
    const result: GradeResult =
      a.optionId === null
        ? { correct: false, score: 0, feedback: null, correctAnswer: "", explanation: rec.exercise.explanation }
        : gradeExercise(rec.exercise, { optionId: a.optionId });
    return [{ rec, section, level: rec.placementLevel as Cefr, response: { optionId: a.optionId }, result }];
  });
  if (graded.length === 0) throw new InvalidResponseError("No valid placement answers.");

  const estimate = estimatePlacement(
    graded.map((g) => ({ section: g.section, level: g.level, correct: g.result.correct })),
  );
  const level = (section: string) => estimate.sections.find((s) => s.section === section);
  const sectionLevel = (section: string) => {
    const s = level(section);
    return s?.enoughEvidence ? s.level : null;
  };

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.placementResult.create({
      data: {
        userId,
        grammarLevel: sectionLevel("grammar"),
        vocabularyLevel: sectionLevel("vocabulary"),
        readingLevel: sectionLevel("reading"),
        overallLevel: estimate.overall,
        scores: JSON.parse(JSON.stringify(estimate)) as Prisma.InputJsonValue,
      },
    });
    await tx.exerciseAttempt.createMany({
      data: graded.map((g) => ({
        userId,
        exerciseId: g.rec.id,
        context: "placement" as const,
        response: g.response,
        isCorrect: g.result.correct,
        score: g.result.score,
        independent: true,
        placementResultId: row.id,
      })),
    });
    return row;
  });

  return { resultId: result.id, estimate };
}

export async function getLatestPlacement(userId: string) {
  return prisma.placementResult.findFirst({ where: { userId }, orderBy: { completedAt: "desc" } });
}

export async function getPlacementResult(userId: string, resultId: string) {
  return prisma.placementResult.findFirst({ where: { id: resultId, userId } });
}

/**
 * Apply the learner's chosen starting level. It is labelled "placement" only when it
 * matches the estimate; any other choice is the learner's own (self-reported) decision.
 */
export async function chooseStartingLevel(userId: string, resultId: string | null, level: Cefr): Promise<void> {
  const placement = resultId ? await getPlacementResult(userId, resultId) : null;
  // With enough evidence, "no level passed" means the placement suggests starting at A1.
  const enoughEvidence = (placement?.scores as { enoughEvidence?: boolean } | null)?.enoughEvidence === true;
  const suggested = placement ? (placement.overallLevel ?? (enoughEvidence ? "A1" : null)) : null;
  const fromPlacement = suggested !== null && suggested === level;
  await prisma.$transaction(async (tx) => {
    if (placement) await tx.placementResult.update({ where: { id: placement.id }, data: { chosenLevel: level } });
    await tx.profile.update({
      where: { userId },
      data: { estimatedLevel: level, levelSource: fromPlacement ? "placement" : "self_reported" },
    });
  });
}
