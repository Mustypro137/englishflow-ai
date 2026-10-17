/**
 * Word-level comparison of a target text with what the learner wrote or what speech
 * recognition heard: used for dictation, transcript comparison and rewrite changes.
 * Pure functions: no I/O, no React.
 *
 * Differences that don't matter for listening are ignored: letter case, punctuation,
 * curly vs straight apostrophes, contractions vs full forms ("I'm" = "I am") and
 * small numbers written as digits or words ("3" = "three").
 */
import { expandContractions } from "./grading/text-answer";

export type DiffOp =
  | { kind: "equal"; expected: string; actual: string }
  /** `near` when the words differ by one letter (probably spelling, not hearing). */
  | { kind: "replace"; expected: string; actual: string; near: boolean }
  | { kind: "missing"; expected: string }
  | { kind: "extra"; actual: string };

interface Token {
  /** What to show: the word as written. Empty for the second word of an expanded contraction. */
  display: string;
  key: string;
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

function keyOf(word: string): string {
  const k = word
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "")
    .replace(/^'+|'+$/g, "");
  return /^\d+$/.test(k) && Number(k) < NUMBER_WORDS.length ? NUMBER_WORDS[Number(k)] : k;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const word of text.split(/\s+/)) {
    const key = keyOf(word);
    if (!key) continue;
    const parts = expandContractions(key).split(" ");
    parts.forEach((part, i) => tokens.push({ display: i === 0 ? word : "", key: part }));
  }
  return tokens;
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const shown = (t: Token) => t.display || t.key;

/**
 * Align the two texts word by word (longest common subsequence) and describe
 * every difference. Adjacent missing/extra words are paired up as replacements.
 */
export function diffWords(expectedText: string, actualText: string): DiffOp[] {
  const a = tokenize(expectedText);
  const b = tokenize(actualText);
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i].key === b[j].key ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const raw: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].key === b[j].key) {
      raw.push({ kind: "equal", expected: a[i].display, actual: b[j].display });
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      raw.push({ kind: "extra", actual: shown(b[j]) });
      j++;
    } else {
      raw.push({ kind: "missing", expected: shown(a[i]) });
      i++;
    }
  }

  // Pair each run of missing words with the run of extra words next to it.
  const ops: DiffOp[] = [];
  for (let k = 0; k < raw.length;) {
    if (raw[k].kind === "equal") {
      ops.push(raw[k++]);
      continue;
    }
    const missing: string[] = [];
    const extra: string[] = [];
    while (k < raw.length && raw[k].kind !== "equal") {
      const op = raw[k++];
      if (op.kind === "missing") missing.push(op.expected);
      else if (op.kind === "extra") extra.push(op.actual);
    }
    const pairs = Math.min(missing.length, extra.length);
    for (let p = 0; p < pairs; p++) {
      const near = missing[p].length >= 4 && editDistanceAtMostOne(keyOf(missing[p]), keyOf(extra[p]));
      ops.push({ kind: "replace", expected: missing[p], actual: extra[p], near });
    }
    for (const w of missing.slice(pairs)) ops.push({ kind: "missing", expected: w });
    for (const w of extra.slice(pairs)) ops.push({ kind: "extra", actual: w });
  }
  return ops;
}

export interface DiffSummary {
  /** Words in the target text (after expanding contractions). */
  total: number;
  correct: number;
  /** Replacements that look like spelling slips (one letter different). */
  nearMisses: number;
  missing: number;
  extra: number;
  wrong: number;
  /** correct / total, 0–1. Extra words lower it too, so typing everything twice doesn't help. */
  accuracy: number;
  exact: boolean;
}

export function summarizeDiff(ops: readonly DiffOp[]): DiffSummary {
  let correct = 0;
  let nearMisses = 0;
  let missing = 0;
  let extra = 0;
  let wrong = 0;
  for (const op of ops) {
    if (op.kind === "equal") correct++;
    else if (op.kind === "missing") missing++;
    else if (op.kind === "extra") extra++;
    else if (op.near) nearMisses++;
    else wrong++;
  }
  const total = correct + missing + nearMisses + wrong;
  const accuracy = total === 0 ? 0 : Math.max(0, correct - extra) / total;
  return {
    total,
    correct,
    nearMisses,
    missing,
    extra,
    wrong,
    accuracy,
    exact: total > 0 && correct === total && extra === 0,
  };
}

/** Compare a dictation answer with the sentence that was played. */
export function compareDictation(expected: string, typed: string): { ops: DiffOp[]; summary: DiffSummary } {
  const ops = diffWords(expected, typed);
  return { ops, summary: summarizeDiff(ops) };
}
