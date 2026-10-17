/**
 * Progress analytics from real study records. Pure functions; the server loads the
 * records (src/server/db/analytics.ts) and the Progress page displays the result.
 *
 * Honest by construction: a rate is only reported once there are at least
 * MIN_SAMPLE answers behind it, placement and AI-generated answers are left out (as
 * they are for mastery), and self-checked pronunciation practice is counted, never scored.
 */
import type { Cefr } from "@content/schemas";
import { weekKey } from "./activity";
import type { MasteryStateName } from "./mastery";
import type { SkillName } from "./snapshot";
import { localDateKey } from "./time";

export const MIN_SAMPLE = 5;
export const RECENT_DAYS = 30;
export const ACTIVITY_WEEKS = 12;
export const RETENTION_WEEKS = 8;
/** Recent accuracy below this, over at least MIN_SAMPLE recent answers, flags a concept. */
export const WEAK_ACCURACY = 0.6;

const DAY = 86_400_000;

export const SKILL_ORDER: readonly SkillName[] = [
  "grammar",
  "vocabulary",
  "listening",
  "reading",
  "writing",
  "pronunciation",
  "sentence_construction",
  "functional_communication",
];

export interface AnswerRecord {
  at: Date;
  skill: SkillName;
  correct: boolean;
  /** No hints and no revealed answer. */
  independent: boolean;
  /** Answered in a review: it also has a review record, so it isn't counted twice as activity. */
  inReview: boolean;
}

export interface ReviewRecord {
  at: Date;
  rating: "again" | "hard" | "good" | "easy";
  previousState: "new" | "learning" | "review" | "relearning";
}

/** A completed lab activity (listening, reading, pronunciation, …) or a saved writing draft. */
export interface PracticeRecord {
  at: Date;
  skill: SkillName;
}

export interface ConceptRecord {
  slug: string;
  name: string;
  skill: SkillName;
  levelCode: Cefr;
  state: MasteryStateName;
  attempts: number;
  correct: number;
  /** Outcomes of the most recent answers, oldest first. */
  recentOutcomes: boolean[];
  lastPracticedAt: Date | null;
}

export interface AnalyticsInput {
  now: Date;
  timeZone: string;
  answers: readonly AnswerRecord[];
  reviews: readonly ReviewRecord[];
  practice: readonly PracticeRecord[];
  concepts: readonly ConceptRecord[];
}

export interface Rate {
  /** Share between 0 and 1, or null when there are fewer than MIN_SAMPLE items. */
  value: number | null;
  count: number;
}

export interface SkillAnalytics {
  skill: SkillName;
  answers: number;
  accuracy: Rate;
  recentAccuracy: Rate;
  independentShare: Rate;
  practiceSessions: number;
  mastery: Record<MasteryStateName, number>;
}

export interface ConceptAnalytics {
  slug: string;
  name: string;
  skill: SkillName;
  levelCode: Cefr;
  state: MasteryStateName;
  attempts: number;
  accuracy: Rate;
  recentAccuracy: Rate;
  lastPracticedAt: Date | null;
  needsAttention: boolean;
}

export interface RetentionAnalytics {
  reviews: number;
  remembered: Rate;
  /** Cards that had already graduated to spaced review: the real test of long-term memory. */
  mature: Rate;
  /** Cards still being learned or relearned. */
  young: Rate;
  weeks: { week: string; reviews: number; remembered: Rate }[];
}

export interface WeekActivity {
  /** Monday of the week, "YYYY-MM-DD" (learner's local calendar). */
  week: string;
  answers: number;
  reviews: number;
  practice: number;
  studyDays: number;
}

export interface ProgressAnalytics {
  skills: SkillAnalytics[];
  concepts: ConceptAnalytics[];
  retention: RetentionAnalytics;
  activity: {
    weeks: WeekActivity[];
    studyDaysLast30: number;
    totalStudyDays: number;
    firstStudyDay: string | null;
  };
  hasData: boolean;
}

export function rate(hits: number, count: number): Rate {
  return { value: count >= MIN_SAMPLE ? hits / count : null, count };
}

const remembered = (r: ReviewRecord) => r.rating !== "again";

function shiftDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The last `count` week keys (oldest first), ending with the current week. */
export function recentWeeks(now: Date, timeZone: string, count: number): string[] {
  const current = weekKey(localDateKey(now, timeZone));
  return Array.from({ length: count }, (_, i) => shiftDays(current, -7 * (count - 1 - i)));
}

export function buildAnalytics(input: AnalyticsInput): ProgressAnalytics {
  const { now, timeZone: tz } = input;
  const recentFrom = new Date(now.getTime() - RECENT_DAYS * DAY);

  // --- Skills -----------------------------------------------------------------
  const skills = SKILL_ORDER.map((skill): SkillAnalytics => {
    const answers = input.answers.filter((a) => a.skill === skill);
    const recent = answers.filter((a) => a.at >= recentFrom);
    const mastery: Record<MasteryStateName, number> = { new: 0, learning: 0, practicing: 0, mastered: 0 };
    for (const c of input.concepts) if (c.skill === skill) mastery[c.state] += 1;
    return {
      skill,
      answers: answers.length,
      accuracy: rate(answers.filter((a) => a.correct).length, answers.length),
      recentAccuracy: rate(recent.filter((a) => a.correct).length, recent.length),
      independentShare: rate(
        answers.filter((a) => a.correct && a.independent).length,
        answers.filter((a) => a.correct).length,
      ),
      practiceSessions: input.practice.filter((p) => p.skill === skill).length,
      mastery,
    };
  }).filter((s) => s.answers > 0 || s.practiceSessions > 0 || Object.values(s.mastery).some((n) => n > 0));

  // --- Concepts (only those actually practised), weakest first ------------------
  const concepts = input.concepts
    .filter((c) => c.attempts > 0)
    .map((c): ConceptAnalytics => {
      const recentAccuracy = rate(c.recentOutcomes.filter(Boolean).length, c.recentOutcomes.length);
      return {
        slug: c.slug,
        name: c.name,
        skill: c.skill,
        levelCode: c.levelCode,
        state: c.state,
        attempts: c.attempts,
        accuracy: rate(c.correct, c.attempts),
        recentAccuracy,
        lastPracticedAt: c.lastPracticedAt,
        needsAttention: recentAccuracy.value !== null && recentAccuracy.value < WEAK_ACCURACY,
      };
    })
    .sort(
      (a, b) =>
        Number(b.needsAttention) - Number(a.needsAttention) ||
        (a.recentAccuracy.value ?? 2) - (b.recentAccuracy.value ?? 2) ||
        a.name.localeCompare(b.name),
    );

  // --- Review retention -------------------------------------------------------
  const mature = input.reviews.filter((r) => r.previousState === "review");
  const young = input.reviews.filter((r) => r.previousState !== "review");
  const retentionWeeks = recentWeeks(now, tz, RETENTION_WEEKS);
  const reviewsByWeek = new Map<string, ReviewRecord[]>();
  for (const r of input.reviews) {
    const wk = weekKey(localDateKey(r.at, tz));
    reviewsByWeek.set(wk, [...(reviewsByWeek.get(wk) ?? []), r]);
  }
  const retention: RetentionAnalytics = {
    reviews: input.reviews.length,
    remembered: rate(input.reviews.filter(remembered).length, input.reviews.length),
    mature: rate(mature.filter(remembered).length, mature.length),
    young: rate(young.filter(remembered).length, young.length),
    weeks: retentionWeeks.map((week) => {
      const list = reviewsByWeek.get(week) ?? [];
      return { week, reviews: list.length, remembered: rate(list.filter(remembered).length, list.length) };
    }),
  };

  // --- Activity over time -----------------------------------------------------
  const weeks = recentWeeks(now, tz, ACTIVITY_WEEKS);
  const byWeek = new Map(weeks.map((w) => [w, { week: w, answers: 0, reviews: 0, practice: 0, studyDays: 0 }]));
  const studyDays = new Set<string>();
  const tally = (at: Date, field: "answers" | "reviews" | "practice") => {
    const day = localDateKey(at, tz);
    studyDays.add(day);
    const entry = byWeek.get(weekKey(day));
    if (entry) entry[field] += 1;
  };
  for (const a of input.answers) if (!a.inReview) tally(a.at, "answers");
  for (const r of input.reviews) tally(r.at, "reviews");
  for (const p of input.practice) tally(p.at, "practice");
  for (const day of studyDays) {
    const entry = byWeek.get(weekKey(day));
    if (entry) entry.studyDays += 1;
  }
  const today = localDateKey(now, tz);
  const from30 = shiftDays(today, -(RECENT_DAYS - 1));
  const sortedDays = [...studyDays].sort();

  return {
    skills,
    concepts,
    retention,
    activity: {
      weeks: [...byWeek.values()],
      studyDaysLast30: sortedDays.filter((d) => d >= from30 && d <= today).length,
      totalStudyDays: sortedDays.length,
      firstStudyDay: sortedDays[0] ?? null,
    },
    hasData: input.answers.length > 0 || input.reviews.length > 0 || input.practice.length > 0,
  };
}
