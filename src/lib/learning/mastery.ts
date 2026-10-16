/**
 * Concept progress rules. Pure functions; thresholds live in MASTERY_CONFIG.
 *
 * Evidence levels:
 *  - Opening a lesson is exposure only. It never changes the mastery state.
 *  - "learning": at least one attempt.
 *  - "practicing": enough correct answers with good recent accuracy.
 *  - "mastered": correct, independent answers in delayed reviews on at least two
 *    separate local days, with high recent accuracy. A wrong review answer removes it.
 */

export const MASTERY_CONFIG = {
  recentWindow: 10,
  practicingMinCorrect: 3,
  practicingMinRecentAccuracy: 0.7,
  masteredMinReviewDays: 2,
  masteredMinRecentAccuracy: 0.8,
} as const;

export type MasteryStateName = "new" | "learning" | "practicing" | "mastered";

export interface ConceptProgressCounts {
  exposures: number;
  attempts: number;
  correct: number;
  independentCorrect: number;
  recentOutcomes: boolean[];
  masteryState: MasteryStateName;
  lastExposedAt: Date | null;
  lastPracticedAt: Date | null;
  /** Number of separate local days with a correct, independent delayed-review answer (since the last lapse). */
  reviewCorrectDays: number;
  /** Local date ("YYYY-MM-DD") of the most recent such day. */
  lastReviewCorrectDay: string | null;
  /** When the concept last became "mastered" (cleared if it lapses). */
  masteredAt: Date | null;
}

export const EMPTY_PROGRESS: ConceptProgressCounts = {
  exposures: 0,
  attempts: 0,
  correct: 0,
  independentCorrect: 0,
  recentOutcomes: [],
  masteryState: "new",
  lastExposedAt: null,
  lastPracticedAt: null,
  reviewCorrectDays: 0,
  lastReviewCorrectDay: null,
  masteredAt: null,
};

export function recentAccuracy(outcomes: readonly boolean[]): number {
  if (outcomes.length === 0) return 0;
  return outcomes.filter(Boolean).length / outcomes.length;
}

/** State from practice evidence alone (no reviews). Never "mastered". */
export function practiceState(
  p: Pick<ConceptProgressCounts, "attempts" | "correct" | "recentOutcomes">,
): MasteryStateName {
  if (p.attempts === 0) return "new";
  if (
    p.correct >= MASTERY_CONFIG.practicingMinCorrect &&
    recentAccuracy(p.recentOutcomes) >= MASTERY_CONFIG.practicingMinRecentAccuracy
  ) {
    return "practicing";
  }
  return "learning";
}

function stateFor(p: ConceptProgressCounts): MasteryStateName {
  if (
    p.reviewCorrectDays >= MASTERY_CONFIG.masteredMinReviewDays &&
    recentAccuracy(p.recentOutcomes) >= MASTERY_CONFIG.masteredMinRecentAccuracy
  ) {
    return "mastered";
  }
  return practiceState(p);
}

export function applyExposure(prev: ConceptProgressCounts, now: Date): ConceptProgressCounts {
  return { ...prev, exposures: prev.exposures + 1, lastExposedAt: now };
}

function withOutcome(prev: ConceptProgressCounts, outcome: { correct: boolean; independent: boolean }, now: Date) {
  return {
    ...prev,
    attempts: prev.attempts + 1,
    correct: prev.correct + (outcome.correct ? 1 : 0),
    independentCorrect: prev.independentCorrect + (outcome.correct && outcome.independent ? 1 : 0),
    recentOutcomes: [...prev.recentOutcomes, outcome.correct].slice(-MASTERY_CONFIG.recentWindow),
    lastPracticedAt: now,
  };
}

/** A practice answer inside a lesson. It can reach "practicing" but never awards "mastered". */
export function applyAttempt(
  prev: ConceptProgressCounts,
  outcome: { correct: boolean; independent: boolean },
  now: Date,
): ConceptProgressCounts {
  const next = withOutcome(prev, outcome, now);
  // Lesson practice doesn't remove mastery earned through reviews; only a failed review does.
  return { ...next, masteryState: prev.masteryState === "mastered" ? "mastered" : practiceState(next) };
}

/**
 * A delayed-review answer. Correct and independent answers on a new local day count
 * towards mastery; a wrong answer resets that count and removes "mastered".
 */
export function applyReview(
  prev: ConceptProgressCounts,
  outcome: { correct: boolean; independent: boolean; dayKey: string },
  now: Date,
): ConceptProgressCounts {
  const next = withOutcome(prev, outcome, now);
  let result: ConceptProgressCounts;
  if (!outcome.correct) {
    const lapsed = { ...next, reviewCorrectDays: 0 };
    result = { ...lapsed, masteryState: practiceState(lapsed) };
  } else if (outcome.independent && outcome.dayKey !== prev.lastReviewCorrectDay) {
    const counted = { ...next, reviewCorrectDays: prev.reviewCorrectDays + 1, lastReviewCorrectDay: outcome.dayKey };
    result = { ...counted, masteryState: stateFor(counted) };
  } else {
    result = { ...next, masteryState: stateFor(next) };
  }
  // Record when mastery is reached; clear it if mastery is lost.
  if (result.masteryState === "mastered") {
    return { ...result, masteredAt: prev.masteryState === "mastered" ? prev.masteredAt : now };
  }
  return { ...result, masteredAt: null };
}
