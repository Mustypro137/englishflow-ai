/**
 * Challenge selection and progress. Pure functions: the server supplies counts of
 * real activity for the period; these functions decide progress and completion.
 */
import { CHALLENGES, type ChallengeDefinition, type ChallengeMetric } from "@content/challenges";
import { weekKey } from "./activity";
import { localDateKey } from "./time";

export interface ChallengePeriods {
  daily: string; // "YYYY-MM-DD" (local)
  weekly: string; // Monday "YYYY-MM-DD" (local)
}

export function challengePeriods(now: Date, timeZone: string): ChallengePeriods {
  const daily = localDateKey(now, timeZone);
  return { daily, weekly: weekKey(daily) };
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Pick `count` distinct items from a pool, the same way every time for a given seed. */
function pick<T>(pool: readonly T[], count: number, seed: string): T[] {
  const ranked = [...pool].map((item, i) => ({ item, r: hash(`${seed}:${i}`) }));
  ranked.sort((a, b) => a.r - b.r);
  return ranked.slice(0, Math.min(count, pool.length)).map((x) => x.item);
}

/** Writing your own sentences is offered every day; the second daily challenge rotates. */
export const EVERY_DAY_CHALLENGE = "daily-five-sentences";

/** Two daily and one weekly challenge per period — the same for everyone, stable within the period. */
export function activeChallenges(periods: ChallengePeriods): { challenge: ChallengeDefinition; periodKey: string }[] {
  const daily = [
    ...CHALLENGES.filter((c) => c.slug === EVERY_DAY_CHALLENGE),
    ...pick(
      CHALLENGES.filter((c) => c.period === "daily" && c.slug !== EVERY_DAY_CHALLENGE),
      1,
      `daily:${periods.daily}`,
    ),
  ];
  const weekly = pick(
    CHALLENGES.filter((c) => c.period === "weekly"),
    1,
    `weekly:${periods.weekly}`,
  );
  return [
    ...daily.map((challenge) => ({ challenge, periodKey: periods.daily })),
    ...weekly.map((challenge) => ({ challenge, periodKey: periods.weekly })),
  ];
}

/** Real activity counts for one challenge's period. */
export interface PeriodActivity {
  independentCorrect: number;
  reviewsDone: number;
  reviewsDueNow: number;
  wordsRecalled: number;
  mistakesFixed: number;
  daysStudied: number;
  lessonsCompleted: number;
  conceptsMastered: number;
  /** Sentences in the learner's written submission for this challenge, if any. */
  sentencesSubmitted: number;
}

export interface ChallengeProgress {
  current: number;
  target: number;
  completed: boolean;
}

export function challengeProgress(c: ChallengeDefinition, a: PeriodActivity): ChallengeProgress {
  const value: Record<ChallengeMetric, number> = {
    independent_correct: a.independentCorrect,
    clear_reviews: a.reviewsDone > 0 && a.reviewsDueNow === 0 ? 1 : 0,
    words_recalled: a.wordsRecalled,
    original_sentences: a.sentencesSubmitted,
    mistakes_fixed: a.mistakesFixed,
    days_studied: a.daysStudied,
    lessons_completed: a.lessonsCompleted,
    concepts_mastered: a.conceptsMastered,
  };
  const current = Math.min(value[c.metric], c.target);
  return { current, target: c.target, completed: value[c.metric] >= c.target };
}

/**
 * Sentences in a piece of learner writing: split on . ! ? or new lines, and
 * count only those with at least three words (so "Hi." doesn't count).
 */
export function countSentences(text: string): number {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3).length;
}
