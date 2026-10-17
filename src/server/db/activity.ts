import "server-only";
import type { Cefr } from "@content/schemas";
import { type Achievement, deriveAchievements } from "@/lib/learning/achievements";
import { countByDay, daysStudiedThisWeek, gentleStreak, lastDays, learningPoints } from "@/lib/learning/activity";
import {
  activeChallenges,
  challengePeriods,
  challengeProgress,
  countSentences,
  type ChallengeProgress,
  type PeriodActivity,
} from "@/lib/learning/challenges";
import type { MasteryStateName } from "@/lib/learning/mastery";
import type { LearnerSnapshot, SkillName, SnapshotLesson } from "@/lib/learning/snapshot";
import { localDateKey, startOfLocalDate } from "@/lib/learning/time";
import type { ChallengeDefinition } from "@content/challenges";
import { prisma } from "./client";
import { getCurriculumGraph, type GraphConcept } from "./curriculum";

/*
 * Learner activity: one bundle of learner-scoped reads that feeds the
 * recommendation engine, the planner, the dashboard, challenges and the calendar.
 * Every query is filtered by the signed-in learner's userId.
 */

const DAY = 86_400_000;
// Skill-lab answers count as study (activity, skills), never as lesson progress.
const STUDY_CONTEXTS = ["lesson", "review", "practice", "skill_lab"] as const;

/** Raw learner records, loaded once per request. */
async function loadRecords(userId: string, now: Date) {
  const since14 = new Date(now.getTime() - 14 * DAY);
  const since8 = new Date(now.getTime() - 8 * DAY);
  const [
    profile,
    prefs,
    graph,
    reviewsDue,
    lessonProgress,
    conceptProgress,
    attempts,
    reviewLogs,
    mistakesOpen,
    mistakesFixed,
    savedWords,
    lastPractice,
    challengeRows,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.learningPreferences.findUnique({ where: { userId } }),
    getCurriculumGraph(),
    prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.lessonProgress.findMany({ where: { userId }, select: { lessonId: true, completedAt: true } }),
    prisma.conceptProgress.findMany({
      where: { userId },
      select: { conceptId: true, masteryState: true, masteredAt: true },
    }),
    // Timestamps only for all-time study days; detail is needed only for recent ones.
    prisma.exerciseAttempt.findMany({
      where: { userId, context: { in: [...STUDY_CONTEXTS] } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        isCorrect: true,
        independent: true,
        context: true,
        exerciseId: true,
        exercise: { select: { skill: true, lessonId: true } },
      },
      take: 50_000,
    }),
    prisma.reviewLog.findMany({
      where: { userId },
      orderBy: { reviewedAt: "asc" },
      select: { reviewedAt: true, rating: true, correct: true, reviewItem: { select: { itemType: true } } },
      take: 50_000,
    }),
    prisma.mistakeRecord.groupBy({
      by: ["conceptId"],
      where: { userId, resolvedAt: null, conceptId: { not: null } },
      _count: { _all: true },
    }),
    prisma.mistakeRecord.findMany({
      where: { userId, resolvedAt: { gte: since8 } },
      select: { resolvedAt: true },
    }),
    prisma.savedWord.count({ where: { userId } }),
    prisma.exerciseAttempt.findFirst({
      where: { userId, context: "practice" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.challengeSubmission.findMany({
      where: { userId },
      select: { challengeSlug: true, periodKey: true, text: true, completedAt: true },
    }),
  ]);
  return {
    profile,
    prefs,
    graph,
    reviewsDue,
    lessonProgress,
    conceptProgress,
    attempts,
    reviewLogs,
    mistakesOpen,
    mistakesFixed,
    savedWords,
    lastPractice,
    challengeRows,
    since14,
  };
}

type Records = Awaited<ReturnType<typeof loadRecords>>;

function buildSnapshot(r: Records, now: Date): LearnerSnapshot {
  const tz = r.profile?.timezone ?? "UTC";
  const completedAt = new Map(r.lessonProgress.map((p) => [p.lessonId, p.completedAt]));
  const answeredByLesson = new Map<string, Set<string>>();
  for (const a of r.attempts) {
    if (a.context !== "lesson" || !a.exercise.lessonId) continue;
    let set = answeredByLesson.get(a.exercise.lessonId);
    if (!set) answeredByLesson.set(a.exercise.lessonId, (set = new Set()));
    set.add(a.exerciseId);
  }
  const stateByConcept = new Map(r.conceptProgress.map((c) => [c.conceptId, c.masteryState as MasteryStateName]));
  const conceptById = new Map(r.graph.concepts.map((c) => [c.id, c]));

  const lessons: SnapshotLesson[] = r.graph.lessons.map((l) => {
    const done = completedAt.get(l.id) ?? null;
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      objective: l.objective,
      levelCode: l.levelCode,
      unitSlug: l.unitSlug,
      unitTitle: l.unitTitle,
      status: l.status,
      estimatedMinutes: l.estimatedMinutes,
      conceptSlugs: l.conceptSlugs,
      answered: answeredByLesson.get(l.id)?.size ?? 0,
      total: l.exerciseCount,
      completed: done !== null,
      completedAt: done,
    };
  });

  const recentPracticeBySkill: Partial<Record<SkillName, number>> = {};
  for (const a of r.attempts) {
    if (a.createdAt < r.since14) continue;
    const skill = a.exercise.skill as SkillName;
    recentPracticeBySkill[skill] = (recentPracticeBySkill[skill] ?? 0) + 1;
  }
  const wordReviews = r.reviewLogs.filter((l) => l.reviewedAt >= r.since14 && l.reviewItem.itemType === "vocabulary");
  if (wordReviews.length > 0) {
    recentPracticeBySkill.vocabulary = (recentPracticeBySkill.vocabulary ?? 0) + wordReviews.length;
  }

  return {
    now,
    timezone: tz,
    level: (r.profile?.estimatedLevel as Cefr | null) ?? null,
    goals: r.profile?.goals ?? [],
    reviewsDue: r.reviewsDue,
    recurringMistakes: r.mistakesOpen
      .map((m) => ({ concept: conceptById.get(m.conceptId!), openMistakes: m._count._all }))
      .filter((m): m is { concept: GraphConcept; openMistakes: number } => m.concept !== undefined)
      .sort((a, b) => b.openMistakes - a.openMistakes)
      .map((m) => ({ conceptSlug: m.concept.slug, name: m.concept.name, openMistakes: m.openMistakes })),
    lessons,
    concepts: r.graph.concepts.map((c) => ({
      slug: c.slug,
      name: c.name,
      skill: c.skill as SkillName,
      levelCode: c.levelCode,
      prerequisites: c.prerequisites,
      state: stateByConcept.get(c.id) ?? "new",
    })),
    recentPracticeBySkill,
    savedWords: r.savedWords,
    lastMixedPracticeAt: r.lastPractice?.createdAt ?? null,
  };
}

/** Every study event (answers, reviews, completed writing), for activity, streaks and the calendar. */
function studyEvents(r: Records): Date[] {
  const events: Date[] = [];
  for (const a of r.attempts) if (a.context !== "review") events.push(a.createdAt); // reviews are counted via logs
  for (const l of r.reviewLogs) events.push(l.reviewedAt);
  for (const c of r.challengeRows) if (c.completedAt && c.text) events.push(c.completedAt);
  return events;
}

function periodActivity(r: Records, from: Date, to: Date, tz: string, text: string | null): PeriodActivity {
  const inRange = (d: Date | null | undefined) => !!d && d >= from && d < to;
  const attempts = r.attempts.filter((a) => inRange(a.createdAt));
  const logs = r.reviewLogs.filter((l) => inRange(l.reviewedAt));
  const days = new Set(
    [...attempts.map((a) => a.createdAt), ...logs.map((l) => l.reviewedAt)].map((d) => localDateKey(d, tz)),
  );
  return {
    independentCorrect: attempts.filter((a) => a.isCorrect && a.independent).length,
    reviewsDone: logs.length,
    reviewsDueNow: r.reviewsDue,
    wordsRecalled: logs.filter((l) => l.reviewItem.itemType === "vocabulary" && l.rating !== "again").length,
    mistakesFixed: r.mistakesFixed.filter((m) => inRange(m.resolvedAt)).length,
    daysStudied: days.size,
    lessonsCompleted: r.lessonProgress.filter((p) => inRange(p.completedAt)).length,
    conceptsMastered: r.conceptProgress.filter((c) => inRange(c.masteredAt)).length,
    sentencesSubmitted: text ? countSentences(text) : 0,
  };
}

export interface ChallengeView {
  challenge: ChallengeDefinition;
  periodKey: string;
  progress: ChallengeProgress;
  /** When the completion was recorded (stays recorded even if counts change later). */
  completedAt: Date | null;
  text: string | null;
}

function challengeViews(r: Records, now: Date): ChallengeView[] {
  const tz = r.profile?.timezone ?? "UTC";
  const periods = challengePeriods(now, tz);
  return activeChallenges(periods).map(({ challenge, periodKey }) => {
    const from = startOfLocalDate(periodKey, tz);
    const to = nextLocalDay(periodKey, challenge.period === "daily" ? 1 : 7, tz);
    const row = r.challengeRows.find((c) => c.challengeSlug === challenge.slug && c.periodKey === periodKey);
    const text = row?.text ?? null;
    const progress = challengeProgress(challenge, periodActivity(r, from, to, tz, text));
    return { challenge, periodKey, progress, completedAt: row?.completedAt ?? null, text };
  });
}

function nextLocalDay(dateKey: string, days: number, tz: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  return startOfLocalDate(next, tz);
}

/** Record completions for challenges whose real activity now meets the target (idempotent). */
async function recordCompletions(userId: string, views: ChallengeView[], now: Date) {
  const newlyDone = views.filter((v) => v.progress.completed && !v.completedAt);
  for (const v of newlyDone) {
    await prisma.challengeSubmission.upsert({
      where: { userId_challengeSlug_periodKey: { userId, challengeSlug: v.challenge.slug, periodKey: v.periodKey } },
      create: { userId, challengeSlug: v.challenge.slug, periodKey: v.periodKey, completedAt: now },
      update: {},
    });
    await prisma.challengeSubmission.updateMany({
      where: { userId, challengeSlug: v.challenge.slug, periodKey: v.periodKey, completedAt: null },
      data: { completedAt: now },
    });
    v.completedAt = now;
  }
  return newlyDone.length > 0;
}

/** The learner's snapshot, for the recommendation engine and the planner. */
export async function getLearnerSnapshot(userId: string, now = new Date()): Promise<LearnerSnapshot> {
  return buildSnapshot(await loadRecords(userId, now), now);
}

export async function getChallenges(userId: string, now = new Date()): Promise<ChallengeView[]> {
  const r = await loadRecords(userId, now);
  const views = challengeViews(r, now);
  await recordCompletions(userId, views, now);
  return views;
}

export interface SkillProgress {
  skill: SkillName;
  counts: Record<MasteryStateName, number>;
  total: number;
}

export interface DashboardData {
  snapshot: LearnerSnapshot;
  gamification: boolean;
  dailyMinutes: number;
  levelSource: "placement" | "self_reported" | "assessment" | null;
  week: { date: string; count: number }[];
  daysThisWeek: number;
  streak: number;
  points: number;
  skills: SkillProgress[];
  achievements: Achievement[];
  challenges: ChallengeView[];
  hasActivity: boolean;
}

export async function getDashboard(userId: string, now = new Date()): Promise<DashboardData> {
  const r = await loadRecords(userId, now);
  const snapshot = buildSnapshot(r, now);
  const tz = snapshot.timezone;
  const byDay = countByDay(studyEvents(r), tz);

  const skills = new Map<SkillName, SkillProgress>();
  for (const c of snapshot.concepts) {
    const lessonsPublished = r.graph.concepts
      .find((g) => g.slug === c.slug)
      ?.lessonSlugs.some((s) => snapshot.lessons.find((l) => l.slug === s)?.status === "published");
    if (!lessonsPublished) continue; // only topics that can actually be studied today
    const entry =
      skills.get(c.skill) ??
      ({ skill: c.skill, counts: { new: 0, learning: 0, practicing: 0, mastered: 0 }, total: 0 } as SkillProgress);
    entry.counts[c.state] += 1;
    entry.total += 1;
    skills.set(c.skill, entry);
  }

  const completions = r.lessonProgress.flatMap((p) => (p.completedAt ? [p.completedAt] : []));
  const completedAt = new Map(r.lessonProgress.map((p) => [p.lessonId, p.completedAt]));
  const units = new Map<string, (Date | null)[]>();
  for (const l of r.graph.lessons) {
    if (l.status !== "published") continue;
    units.set(l.unitSlug, [...(units.get(l.unitSlug) ?? []), completedAt.get(l.id) ?? null]);
  }
  const unitCompletions = [...units.values()]
    .filter((list) => list.every((d) => d !== null))
    .map((list) => new Date(Math.max(...list.map((d) => d!.getTime()))));

  const views = challengeViews(r, now);
  await recordCompletions(userId, views, now);
  const challengeCompletions = r.challengeRows.flatMap((c) => (c.completedAt ? [c.completedAt] : []));
  for (const v of views)
    if (v.completedAt && !challengeCompletions.includes(v.completedAt)) challengeCompletions.push(v.completedAt);

  const firstAnswer = r.attempts[0]?.createdAt ?? null;
  const achievements = deriveAchievements({
    firstAnswerAt: firstAnswer,
    lessonCompletions: completions,
    unitCompletions,
    firstReviewAt: r.reviewLogs[0]?.reviewedAt ?? null,
    masteredAt: r.conceptProgress.flatMap((c) => (c.masteredAt ? [c.masteredAt] : [])),
    studyDays: [...byDay.keys()].sort(),
    challengeCompletions,
  });

  return {
    snapshot,
    gamification: r.prefs?.gamificationEnabled ?? true,
    dailyMinutes: r.prefs?.dailyMinutes ?? 20,
    levelSource: r.profile?.levelSource ?? null,
    week: lastDays(byDay, now, tz),
    daysThisWeek: daysStudiedThisWeek(byDay, now, tz),
    streak: gentleStreak(byDay, now, tz),
    points: learningPoints({
      independentCorrect: r.attempts.filter((a) => a.isCorrect && a.independent).length,
      helpedCorrect: r.attempts.filter((a) => a.isCorrect && !a.independent).length,
      reviewsRemembered: r.reviewLogs.filter((l) => l.rating !== "again").length,
      challengesCompleted: challengeCompletions.length,
    }),
    skills: [...skills.values()],
    achievements,
    challenges: views,
    hasActivity: r.attempts.length > 0 || r.reviewLogs.length > 0,
  };
}

export interface CalendarData {
  timezone: string;
  /** Study activity per local day in the requested month. */
  month: { year: number; month: number; days: { date: string; count: number }[] };
  /** Reviews falling due on each of the next 14 local days (day 0 includes anything overdue). */
  reviewLoad: { date: string; count: number }[];
  sessions: { id: string; startedAt: Date; completedAt: Date | null; plannedMinutes: number }[];
}

export async function getCalendar(
  userId: string,
  view: { year: number; month: number },
  now = new Date(),
): Promise<CalendarData> {
  const r = await loadRecords(userId, now);
  const tz = r.profile?.timezone ?? "UTC";
  const byDay = countByDay(studyEvents(r), tz);
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${view.year}-${String(view.month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return { date, count: byDay.get(date) ?? 0 };
  });

  const today = localDateKey(now, tz);
  const horizon = nextLocalDay(today, 14, tz);
  const [due, sessions] = await Promise.all([
    prisma.reviewItem.findMany({ where: { userId, dueAt: { lt: horizon } }, select: { dueAt: true } }),
    prisma.studySession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startOfLocalDate(days[0].date, tz),
          lt: nextLocalDay(days[days.length - 1].date, 1, tz),
        },
      },
      orderBy: { startedAt: "asc" },
      select: { id: true, startedAt: true, completedAt: true, plannedMinutes: true },
    }),
  ]);
  const load = new Map<string, number>();
  for (const d of due) {
    const key = d.dueAt <= now ? today : localDateKey(d.dueAt, tz);
    load.set(key, (load.get(key) ?? 0) + 1);
  }
  const reviewLoad = Array.from({ length: 14 }, (_, i) => {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    return { date, count: load.get(date) ?? 0 };
  });

  return { timezone: tz, month: { ...view, days }, reviewLoad, sessions };
}
