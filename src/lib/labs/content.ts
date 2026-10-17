/**
 * Validated skill-lab content, loaded once per server process.
 * Content lives in content/labs; questions are also seeded as exercises for grading.
 */
import type { Cefr } from "@content/schemas";
import { type ValidatedLabs, validateContent } from "@content/validate";

let cached: ValidatedLabs | null = null;

export function labContent(): ValidatedLabs {
  cached ??= validateContent().labs;
  return cached;
}

const LEVEL_ORDER: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const levelIndex = (level: Cefr) => LEVEL_ORDER.indexOf(level);

export const findListening = (slug: string) => labContent().listeningItems.find((i) => i.slug === slug) ?? null;
export const findReading = (slug: string) => labContent().readingTexts.find((t) => t.slug === slug) ?? null;
export const findWritingTask = (slug: string) => labContent().writingTasks.find((t) => t.slug === slug) ?? null;
export const findScenario = (slug: string) => labContent().scenarios.find((s) => s.slug === slug) ?? null;
export const findSentencePrompt = (slug: string) =>
  labContent().originalSentencePrompts.find((p) => p.slug === slug) ?? null;

/** Pronunciation sets by slug, whatever their kind. */
export function findPronunciationSet(slug: string) {
  const p = labContent().pronunciation;
  const pairs = p.minimalPairs.find((s) => s.slug === slug);
  if (pairs) return { kind: "pairs" as const, set: pairs };
  const stress = p.stress.find((s) => s.slug === slug);
  if (stress) return { kind: "stress" as const, set: stress };
  const intonation = p.intonation.find((s) => s.slug === slug);
  if (intonation) return { kind: "intonation" as const, set: intonation };
  return null;
}

/** Items sorted with the learner's level first, then easier, then harder. */
export function byClosestLevel<T extends { level: Cefr }>(items: readonly T[], level: Cefr | null): T[] {
  const target = levelIndex(level ?? "A1");
  return [...items].sort((a, b) => {
    const da = levelIndex(a.level) - target;
    const db = levelIndex(b.level) - target;
    const rank = (d: number) => (d === 0 ? 0 : d < 0 ? 1 - d / 10 : 2 + d);
    return rank(da) - rank(db);
  });
}
