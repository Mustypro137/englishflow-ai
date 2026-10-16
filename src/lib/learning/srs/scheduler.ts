/**
 * Spaced-repetition scheduler (SM-2-inspired). Pure and deterministic: given a card,
 * a rating and the current time, it returns the card's next state.
 *
 *  - New items pass through short learning steps before they graduate.
 *  - "Again" shortens the interval (and lowers ease); "Easy" lengthens it.
 *  - Intervals grow with each successful review, up to a maximum.
 *  - A small, seeded "fuzz" spreads reviews so they don't all land on one day.
 */

export type Rating = "again" | "hard" | "good" | "easy";
export type CardState = "new" | "learning" | "review" | "relearning";

export interface SrsCard {
  state: CardState;
  /** Index into the learning or relearning steps. */
  step: number;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: Date;
}

export const SRS_CONFIG = {
  learningStepsMinutes: [10, 1440],
  relearningStepsMinutes: [10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEase: 2.5,
  minEase: 1.3,
  maxEase: 3.0,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  lapseEasePenalty: 0.2,
  hardEasePenalty: 0.15,
  easyEaseBonus: 0.15,
  maxIntervalDays: 365,
  fuzzRatio: 0.05,
} as const;

const MINUTE = 60_000;
const DAY = 86_400_000;

export function newCard(now: Date): SrsCard {
  return { state: "new", step: 0, ease: SRS_CONFIG.startingEase, intervalDays: 0, reps: 0, lapses: 0, dueAt: now };
}

/** A card for something just practised in a lesson: its first review is a delayed one, tomorrow. */
export function cardAfterLesson(now: Date): SrsCard {
  return { ...newCard(now), state: "learning", step: 1, dueAt: new Date(now.getTime() + DAY) };
}

const clampEase = (e: number) => Math.min(SRS_CONFIG.maxEase, Math.max(SRS_CONFIG.minEase, Math.round(e * 100) / 100));

/** Deterministic ±fuzzRatio adjustment so equal intervals don't all land on the same day. */
function fuzz(intervalDays: number, seed: string): number {
  const delta = Math.round(intervalDays * SRS_CONFIG.fuzzRatio);
  if (delta < 1) return intervalDays; // short intervals stay exact
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  const unit = ((h >>> 0) % 10_000) / 10_000; // 0..1
  return intervalDays + Math.round((unit * 2 - 1) * delta);
}

function graduate(card: SrsCard, intervalDays: number, now: Date, seed: string): SrsCard {
  const days = Math.min(SRS_CONFIG.maxIntervalDays, Math.max(1, fuzz(Math.round(intervalDays), seed)));
  return { ...card, state: "review", step: 0, intervalDays: days, dueAt: new Date(now.getTime() + days * DAY) };
}

/**
 * Next state of a card after the learner rates it.
 * `seed` (e.g. item id) keeps the fuzz deterministic for tests and reloads.
 */
export function schedule(card: SrsCard, rating: Rating, now: Date, seed = ""): SrsCard {
  const reps = card.reps + 1;
  const fuzzSeed = `${seed}:${reps}`;

  if (card.state === "new" || card.state === "learning") {
    const steps = SRS_CONFIG.learningStepsMinutes;
    const base = { ...card, reps, state: "learning" as const };
    switch (rating) {
      case "again":
        return { ...base, step: 0, dueAt: new Date(now.getTime() + steps[0] * MINUTE) };
      case "hard": {
        const minutes = steps[Math.min(card.step, steps.length - 1)] * 1.5;
        return { ...base, dueAt: new Date(now.getTime() + Math.min(minutes, DAY / MINUTE) * MINUTE) };
      }
      case "good": {
        const next = card.step + 1;
        if (next < steps.length) return { ...base, step: next, dueAt: new Date(now.getTime() + steps[next] * MINUTE) };
        return graduate(base, SRS_CONFIG.graduatingIntervalDays, now, fuzzSeed);
      }
      case "easy":
        return graduate(base, SRS_CONFIG.easyIntervalDays, now, fuzzSeed);
    }
  }

  if (card.state === "relearning") {
    const steps = SRS_CONFIG.relearningStepsMinutes;
    const base = { ...card, reps };
    switch (rating) {
      case "again":
        return { ...base, step: 0, dueAt: new Date(now.getTime() + steps[0] * MINUTE) };
      case "hard":
        return {
          ...base,
          dueAt: new Date(now.getTime() + steps[Math.min(card.step, steps.length - 1)] * 1.5 * MINUTE),
        };
      case "good":
      case "easy":
        return graduate(base, Math.max(1, card.intervalDays), now, fuzzSeed);
    }
  }

  // Review state
  const interval = Math.max(1, card.intervalDays);
  switch (rating) {
    case "again":
      return {
        ...card,
        reps,
        state: "relearning",
        step: 0,
        lapses: card.lapses + 1,
        ease: clampEase(card.ease - SRS_CONFIG.lapseEasePenalty),
        // After relearning, the item restarts from a short interval.
        intervalDays: 1,
        dueAt: new Date(now.getTime() + SRS_CONFIG.relearningStepsMinutes[0] * MINUTE),
      };
    case "hard":
      return graduate(
        { ...card, reps, ease: clampEase(card.ease - SRS_CONFIG.hardEasePenalty) },
        Math.max(interval + 1, interval * SRS_CONFIG.hardMultiplier),
        now,
        fuzzSeed,
      );
    case "good":
      return graduate({ ...card, reps }, Math.max(interval + 1, interval * card.ease), now, fuzzSeed);
    case "easy": {
      const ease = clampEase(card.ease + SRS_CONFIG.easyEaseBonus);
      return graduate(
        { ...card, reps, ease },
        Math.max(interval + 2, interval * card.ease * SRS_CONFIG.easyBonus),
        now,
        fuzzSeed,
      );
    }
  }
}

/** Map a graded exercise answer to a rating: wrong → again; right with help → hard; right alone → good. */
export function ratingFromAnswer(correct: boolean, helped: boolean): Rating {
  if (!correct) return "again";
  return helped ? "hard" : "good";
}
