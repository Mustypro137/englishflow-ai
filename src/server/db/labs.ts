import "server-only";
import type { Prisma, Skill } from "@/generated/prisma/client";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { type GradeResult, gradeExercise, InvalidResponseError } from "@/lib/learning/grading/grade-exercise";
import { compareDictation } from "@/lib/learning/text-diff";
import { prisma } from "./client";
import { parseStoredExercise, toClient } from "./curriculum";

/*
 * Skill-lab records: answers to listening and reading questions, completed
 * activities and their history. Every function is scoped to the learner's userId.
 * Lab answers are skill practice: they never change grammar mastery or reviews.
 */

export type LabSkill = Extract<Skill, "listening" | "reading" | "pronunciation">;

/** Lab questions by slug, in the given order, ready for the browser. Missing ones are skipped. */
export async function getLabQuestions(slugs: readonly string[]): Promise<{ slug: string; exercise: ClientExercise }[]> {
  "use cache";
  const rows = await prisma.exercise.findMany({
    where: { slug: { in: [...slugs] }, phase: "skill_lab", archivedAt: null },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.flatMap((s) => {
    const row = bySlug.get(s);
    return row ? [{ slug: s, exercise: toClient(row) }] : [];
  });
}

/** Grade a lab answer on the server and record it as skill practice. */
export async function recordLabAttempt(
  userId: string,
  input: { exerciseId: string; response: unknown; hintsUsed: number; revealedAnswer: boolean },
): Promise<GradeResult> {
  const row = await prisma.exercise.findFirst({
    where: { id: input.exerciseId, phase: "skill_lab", archivedAt: null },
  });
  if (!row) throw new InvalidResponseError("This exercise is not a lab question.");
  const result = gradeExercise(parseStoredExercise(row), input.response);
  await prisma.exerciseAttempt.create({
    data: {
      userId,
      exerciseId: row.id,
      context: "skill_lab",
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

export interface DictationResult {
  line: number;
  accuracy: number;
  exact: boolean;
}

export interface CompletedActivity {
  correct: number;
  total: number;
  answered: number;
  dictation: DictationResult[];
}

/**
 * Record a finished activity. The score is worked out on the server: the first answer
 * to each question since this item was last completed (so retries don't inflate it),
 * and dictation accuracy recomputed from what the learner typed.
 */
export async function completeLabActivity(
  userId: string,
  input: {
    skill: LabSkill;
    itemSlug: string;
    mode: "audio" | "text";
    questionSlugs: readonly string[];
    dictation?: { line: number; expected: string; typed: string }[];
    extra?: Record<string, number | string | boolean>;
  },
): Promise<CompletedActivity> {
  const previous = await prisma.skillActivity.findFirst({
    where: { userId, skill: input.skill, itemSlug: input.itemSlug },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  const attempts = input.questionSlugs.length
    ? await prisma.exerciseAttempt.findMany({
        where: {
          userId,
          context: "skill_lab",
          exercise: { slug: { in: [...input.questionSlugs] } },
          ...(previous ? { createdAt: { gt: previous.completedAt } } : {}),
        },
        orderBy: { createdAt: "asc" },
        select: { exerciseId: true, isCorrect: true },
      })
    : [];
  const first = new Map<string, boolean>();
  for (const a of attempts) if (!first.has(a.exerciseId)) first.set(a.exerciseId, a.isCorrect);
  const correct = [...first.values()].filter(Boolean).length;

  const dictation = (input.dictation ?? []).map((d) => {
    const { summary } = compareDictation(d.expected, d.typed);
    return { line: d.line, accuracy: Math.round(summary.accuracy * 100) / 100, exact: summary.exact };
  });

  await prisma.skillActivity.create({
    data: {
      userId,
      skill: input.skill,
      itemSlug: input.itemSlug,
      mode: input.mode,
      correct,
      total: input.questionSlugs.length,
      details: { answered: first.size, dictation, ...(input.extra ?? {}) } as Prisma.InputJsonValue,
    },
  });
  return { correct, total: input.questionSlugs.length, answered: first.size, dictation };
}

export interface LabHistoryEntry {
  times: number;
  lastCompletedAt: Date;
  lastCorrect: number;
  lastTotal: number;
  lastMode: string;
}

/** Each item's completion history for one skill. */
export async function getLabHistory(userId: string, skill: LabSkill): Promise<Map<string, LabHistoryEntry>> {
  const rows = await prisma.skillActivity.findMany({
    where: { userId, skill },
    orderBy: { completedAt: "desc" },
    select: { itemSlug: true, completedAt: true, correct: true, total: true, mode: true },
  });
  const out = new Map<string, LabHistoryEntry>();
  for (const r of rows) {
    const e = out.get(r.itemSlug);
    if (e) e.times++;
    else
      out.set(r.itemSlug, {
        times: 1,
        lastCompletedAt: r.completedAt,
        lastCorrect: r.correct,
        lastTotal: r.total,
        lastMode: r.mode,
      });
  }
  return out;
}

/** Completed lab activities per skill since a date (for the planner and dashboard). */
export async function countLabActivity(userId: string, since: Date): Promise<Record<LabSkill, number>> {
  const rows = await prisma.skillActivity.groupBy({
    by: ["skill"],
    where: { userId, completedAt: { gte: since } },
    _count: { _all: true },
  });
  const out: Record<LabSkill, number> = { listening: 0, reading: 0, pronunciation: 0 };
  for (const r of rows) if (r.skill in out) out[r.skill as LabSkill] = r._count._all;
  return out;
}

/**
 * Pronunciation practice is checked in the browser (which word did you hear?), so the
 * score is the learner's own practice record — never used as a pronunciation score.
 */
export async function recordPronunciationPractice(
  userId: string,
  input: { setSlug: string; activity: string; mode: "audio" | "text"; correct: number; total: number },
): Promise<void> {
  const total = Math.max(0, Math.min(50, Math.trunc(input.total)));
  const correct = Math.max(0, Math.min(total, Math.trunc(input.correct)));
  await prisma.skillActivity.create({
    data: {
      userId,
      skill: "pronunciation",
      itemSlug: input.setSlug,
      mode: input.mode,
      correct,
      total,
      details: { activity: input.activity, selfChecked: true },
    },
  });
}
