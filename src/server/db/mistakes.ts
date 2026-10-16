import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { describeResponse } from "@/lib/learning/grading/describe-response";
import type { GradableExercise, GradeResult } from "@/lib/learning/grading/grade-exercise";
import { prisma } from "./client";

/*
 * Mistake tracker. A wrong answer creates a record; later answers to the same
 * exercise are counted, and a correct one marks the open mistakes as resolved.
 * Every query is scoped to the signed-in learner's userId.
 */

type Tx = Prisma.TransactionClient;

export async function trackAnswer(
  tx: Tx,
  userId: string,
  input: {
    exerciseId: string;
    exercise: GradableExercise;
    conceptIds: string[];
    response: unknown;
    result: GradeResult;
    context: "lesson" | "review" | "practice";
  },
  now: Date,
): Promise<void> {
  const { exerciseId, result } = input;
  // Update earlier open mistakes on this exercise with this new result.
  await tx.mistakeRecord.updateMany({
    where: { userId, exerciseId, resolvedAt: null },
    data: {
      laterAttempts: { increment: 1 },
      laterCorrect: { increment: result.correct ? 1 : 0 },
      ...(result.correct ? { resolvedAt: now } : {}),
    },
  });
  if (!result.correct) {
    await tx.mistakeRecord.create({
      data: {
        userId,
        exerciseId,
        conceptId: input.conceptIds[0] ?? null,
        context: input.context,
        originalAnswer: describeResponse(input.exercise, input.response),
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        feedback: result.feedback,
      },
    });
  }
}

export interface MistakeView {
  id: string;
  createdAt: Date;
  resolvedAt: Date | null;
  context: "lesson" | "placement" | "review" | "practice";
  originalAnswer: string;
  correctAnswer: string;
  explanation: string;
  feedback: string | null;
  laterAttempts: number;
  laterCorrect: number;
  instructions: string;
  conceptName: string | null;
  lesson: { slug: string; title: string } | null;
}

export async function listMistakes(
  userId: string,
  opts: { limit?: number; openOnly?: boolean } = {},
): Promise<MistakeView[]> {
  const rows = await prisma.mistakeRecord.findMany({
    where: { userId, ...(opts.openOnly ? { resolvedAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
    include: {
      concept: { select: { name: true } },
      exercise: { select: { instructions: true, lesson: { select: { slug: true, title: true } } } },
    },
  });
  return rows.map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    resolvedAt: m.resolvedAt,
    context: m.context,
    originalAnswer: m.originalAnswer,
    correctAnswer: m.correctAnswer,
    explanation: m.explanation,
    feedback: m.feedback,
    laterAttempts: m.laterAttempts,
    laterCorrect: m.laterCorrect,
    instructions: m.exercise.instructions,
    conceptName: m.concept?.name ?? null,
    lesson: m.exercise.lesson,
  }));
}

/** Delete one of the learner's own mistake records. Returns false if it isn't theirs. */
export async function deleteMistake(userId: string, mistakeId: string): Promise<boolean> {
  const { count } = await prisma.mistakeRecord.deleteMany({ where: { id: mistakeId, userId } });
  return count === 1;
}

/** Concepts with the most open mistakes, for targeted practice suggestions. */
export async function recurringMistakeConcepts(userId: string, limit = 3) {
  const grouped = await prisma.mistakeRecord.groupBy({
    by: ["conceptId"],
    where: { userId, resolvedAt: null, conceptId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { conceptId: "desc" } },
    take: limit,
  });
  const concepts = await prisma.concept.findMany({
    where: { id: { in: grouped.map((g) => g.conceptId!) } },
    select: { id: true, name: true },
  });
  return grouped.map((g) => ({
    conceptId: g.conceptId!,
    name: concepts.find((c) => c.id === g.conceptId)?.name ?? "",
    openMistakes: g._count._all,
  }));
}
