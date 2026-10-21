import "server-only";
import { buildAnalytics, type ProgressAnalytics } from "@/lib/learning/analytics";
import type { MasteryStateName } from "@/lib/learning/mastery";
import type { SkillName } from "@/lib/learning/snapshot";
import { prisma } from "./client";
import { getCurriculumGraph } from "./curriculum";

/*
 * Records behind the Progress page, all filtered by the signed-in learner's userId.
 * Placement answers and answers to AI-generated exercises are not evidence of progress,
 * so they are left out (the same rule as for mastery).
 */

const PROGRESS_CONTEXTS = ["lesson", "review", "practice", "skill_lab"] as const;

export async function getProgressAnalytics(userId: string, now = new Date()): Promise<ProgressAnalytics> {
  const [profile, graph, attempts, reviewLogs, activities, drafts, progress] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { timezone: true } }),
    getCurriculumGraph(),
    prisma.exerciseAttempt.findMany({
      where: { userId, context: { in: [...PROGRESS_CONTEXTS] } },
      select: {
        createdAt: true,
        isCorrect: true,
        independent: true,
        context: true,
        exercise: { select: { skill: true } },
      },
      take: 50_000,
    }),
    prisma.reviewLog.findMany({
      where: { userId },
      select: { reviewedAt: true, rating: true, previousState: true },
      take: 50_000,
    }),
    prisma.skillActivity.findMany({ where: { userId }, select: { completedAt: true, skill: true } }),
    prisma.writingDraft.findMany({ where: { userId }, select: { createdAt: true } }),
    prisma.conceptProgress.findMany({
      where: { userId },
      select: {
        conceptId: true,
        masteryState: true,
        attempts: true,
        correct: true,
        recentOutcomes: true,
        lastPracticedAt: true,
      },
    }),
  ]);

  // Concepts that can be studied today (taught in a published lesson), plus any already practised.
  const published = new Set(graph.lessons.filter((l) => l.status === "published").map((l) => l.slug));
  const progressById = new Map(progress.map((p) => [p.conceptId, p]));
  const concepts = graph.concepts
    .filter((c) => progressById.has(c.id) || c.lessonSlugs.some((s) => published.has(s)))
    .map((c) => {
      const p = progressById.get(c.id);
      return {
        slug: c.slug,
        name: c.name,
        skill: c.skill as SkillName,
        levelCode: c.levelCode,
        state: (p?.masteryState ?? "new") as MasteryStateName,
        attempts: p?.attempts ?? 0,
        correct: p?.correct ?? 0,
        recentOutcomes: p?.recentOutcomes ?? [],
        lastPracticedAt: p?.lastPracticedAt ?? null,
      };
    });

  return buildAnalytics({
    now,
    timeZone: profile?.timezone ?? "UTC",
    answers: attempts.map((a) => ({
      at: a.createdAt,
      skill: a.exercise.skill as SkillName,
      correct: a.isCorrect,
      independent: a.independent,
      inReview: a.context === "review",
    })),
    reviews: reviewLogs.map((l) => ({ at: l.reviewedAt, rating: l.rating, previousState: l.previousState })),
    practice: [
      ...activities.map((a) => ({ at: a.completedAt, skill: a.skill as SkillName })),
      ...drafts.map((d) => ({ at: d.createdAt, skill: "writing" as const })),
    ],
    concepts,
  });
}
