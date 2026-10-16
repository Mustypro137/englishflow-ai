/**
 * Concept progress rules. Pure functions; thresholds live in MASTERY_CONFIG.
 *
 * Evidence levels:
 *  - Opening a lesson is exposure only. It never changes the mastery state.
 *  - "learning": at least one attempt.
 *  - "practicing": enough correct answers with good recent accuracy.
 *  - "mastered": requires correct independent recall in delayed reviews on separate
 *    days. Reviews arrive in Milestone 4, so these functions never award "mastered".
 */

export const MASTERY_CONFIG = {
  recentWindow: 10,
  practicingMinCorrect: 3,
  practicingMinRecentAccuracy: 0.7,
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
};

export function recentAccuracy(outcomes: readonly boolean[]): number {
  if (outcomes.length === 0) return 0;
  return outcomes.filter(Boolean).length / outcomes.length;
}

/** State from attempt evidence alone (never "mastered"; see module comment). */
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

export function applyExposure(prev: ConceptProgressCounts, now: Date): ConceptProgressCounts {
  return { ...prev, exposures: prev.exposures + 1, lastExposedAt: now };
}

export function applyAttempt(
  prev: ConceptProgressCounts,
  outcome: { correct: boolean; independent: boolean },
  now: Date,
): ConceptProgressCounts {
  const recentOutcomes = [...prev.recentOutcomes, outcome.correct].slice(-MASTERY_CONFIG.recentWindow);
  const next = {
    ...prev,
    attempts: prev.attempts + 1,
    correct: prev.correct + (outcome.correct ? 1 : 0),
    independentCorrect: prev.independentCorrect + (outcome.correct && outcome.independent ? 1 : 0),
    recentOutcomes,
    lastPracticedAt: now,
  };
  // A concept already mastered through reviews (Milestone 4) is not downgraded by practice here.
  return { ...next, masteryState: prev.masteryState === "mastered" ? "mastered" : practiceState(next) };
}
