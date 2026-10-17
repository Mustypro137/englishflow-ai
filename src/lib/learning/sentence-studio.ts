/**
 * Checks for the sentence studio. They look at structure only (did the sentence
 * keep its words and grow? does it use the pattern?), never at whether it is
 * grammatically perfect — the learner compares with examples or asks for feedback.
 * Pure functions.
 */
import { containsPhrase } from "@content/labs/schemas";
import { tokenize } from "./text-diff";

export interface ExpansionCheck {
  ok: boolean;
  /** Words from the previous sentence that are missing. */
  missing: string[];
  addedWords: number;
  endsWithPunctuation: boolean;
}

/** An expanded sentence must keep every word of the previous one (in any order) and add at least one. */
export function checkExpansion(previous: string, next: string): ExpansionCheck {
  const before = tokenize(previous);
  const after = tokenize(next);
  const available = new Map<string, number>();
  for (const t of after) available.set(t.key, (available.get(t.key) ?? 0) + 1);
  const missing: string[] = [];
  for (const t of before) {
    const n = available.get(t.key) ?? 0;
    if (n > 0) available.set(t.key, n - 1);
    else missing.push(t.display || t.key);
  }
  const addedWords = after.length - before.length;
  return {
    ok: missing.length === 0 && addedWords > 0,
    missing,
    addedWords,
    endsWithPunctuation: /[.!?]["”’)]?\s*$/.test(next.trim()),
  };
}

/** Does the sentence use one of the pattern's forms ("there is", "there's"…)? */
export function usesPattern(sentence: string, forms: readonly string[]): boolean {
  return forms.some((f) => containsPhrase(sentence, f));
}
