import "server-only";
import type { ExerciseContent } from "@content/schemas";
import type { Prisma } from "@/generated/prisma/client";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { type GradeResult, gradeExercise, InvalidResponseError } from "@/lib/learning/grading/grade-exercise";
import { prisma } from "./client";
import { parseStoredExercise, toClient } from "./curriculum";

/*
 * AI-generated practice. Generated exercises are shared content (they contain nothing
 * about a learner), stored with source "ai". Answers to them are recorded with context
 * "generated" and never count as evidence for mastery, reviews or the learner's level.
 */

/** How many unanswered generated exercises a learner sees at once. */
export const GENERATED_SET_SIZE = 5;

/** A concept can get generated practice only if a published lesson teaches it. */
export async function getGeneratableConcept(slug: string) {
  return prisma.concept.findFirst({
    where: { slug, lessons: { some: { lesson: { status: "published", archivedAt: null } } } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      levelCode: true,
      skill: true,
      lessons: {
        where: { lesson: { status: "published", archivedAt: null } },
        select: { lesson: { select: { slug: true, title: true, objective: true, body: true } } },
        take: 1,
      },
    },
  });
}

/** Existing (seeded and generated) exercises for a concept, used as examples and for duplicate checks. */
export async function conceptExercises(conceptId: string) {
  const rows = await prisma.exercise.findMany({
    where: { archivedAt: null, phase: { not: "placement" }, concepts: { some: { conceptId } } },
    orderBy: [{ source: "desc" }, { order: "asc" }],
  });
  return rows.map((row) => ({ source: row.source, contentHash: row.contentHash, exercise: parseStoredExercise(row) }));
}

/** Store validated generated exercises; skips any whose hash already exists. Returns how many were stored. */
export async function storeGeneratedExercises(
  conceptId: string,
  items: { exercise: ExerciseContent; hash: string }[],
): Promise<number> {
  let stored = 0;
  for (const { exercise, hash } of items) {
    const exists = await prisma.exercise.findFirst({
      where: { OR: [{ contentHash: hash }, { slug: exercise.slug }] },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.exercise.create({
      data: {
        slug: exercise.slug,
        lessonId: null,
        type: exercise.type,
        phase: "independent",
        order: 0,
        objective: exercise.objective,
        instructions: exercise.instructions,
        explanation: exercise.explanation,
        hint: exercise.hint ?? null,
        payload: exercise.payload as Prisma.InputJsonValue,
        difficulty: exercise.difficulty,
        skill: exercise.skill,
        source: "ai",
        reviewStatus: "ai_generated_unreviewed",
        contentHash: hash,
        concepts: { create: [{ conceptId }] },
      },
    });
    stored += 1;
  }
  return stored;
}

/** Generated exercises for a concept that this learner hasn't answered yet (cached for reuse). */
export async function getGeneratedPractice(
  userId: string,
  conceptId: string,
): Promise<{ exercises: ClientExercise[]; answered: number }> {
  const where = { source: "ai", archivedAt: null, concepts: { some: { conceptId } } } as const;
  const [rows, answered] = await Promise.all([
    prisma.exercise.findMany({
      where: { ...where, attempts: { none: { userId } } },
      orderBy: { slug: "asc" },
      take: GENERATED_SET_SIZE,
    }),
    prisma.exercise.count({ where: { ...where, attempts: { some: { userId } } } }),
  ]);
  return { exercises: rows.map(toClient), answered };
}

/** Grade an answer to a generated exercise and record it — without touching mastery, reviews or mistakes. */
export async function recordGeneratedAttempt(
  userId: string,
  input: { exerciseId: string; response: unknown; hintsUsed: number; revealedAnswer: boolean },
): Promise<GradeResult> {
  const row = await prisma.exercise.findFirst({ where: { id: input.exerciseId, source: "ai", archivedAt: null } });
  if (!row) throw new InvalidResponseError("This exercise is not a generated exercise.");
  const result = gradeExercise(parseStoredExercise(row), input.response);
  await prisma.exerciseAttempt.create({
    data: {
      userId,
      exerciseId: row.id,
      context: "generated",
      response: input.response as Prisma.InputJsonValue,
      isCorrect: result.correct,
      score: result.score,
      hintsUsed: input.hintsUsed,
      revealedAnswer: input.revealedAnswer,
      independent: input.hintsUsed === 0 && !input.revealedAnswer,
    },
  });
  return result;
}
