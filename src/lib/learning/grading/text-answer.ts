/**
 * Deterministic checking for short typed answers (gap fill, short answer, sentences).
 * Pure functions: no I/O, no React.
 */

export interface TextAnswerSpec {
  /** All answers that should be marked correct. */
  accepted: readonly string[];
  /** Targeted feedback for predictable wrong answers, keyed by the answer as a learner might type it. */
  wrongAnswerFeedback?: Readonly<Record<string, string>>;
  caseSensitive?: boolean;
  /** Treat contractions and full forms as equal ("isn't" = "is not"). Default true. */
  contractionsEquivalent?: boolean;
}

export type TextAnswerResult =
  { status: "empty" } | { status: "correct"; matched: string } | { status: "incorrect"; feedback?: string };

/**
 * Normalize a learner's answer so that formatting differences do not count as errors:
 * surrounding/repeated whitespace, curly vs straight apostrophes and quotes,
 * spaces before punctuation, and trailing sentence punctuation.
 */
export function normalizeAnswer(raw: string, { caseSensitive = false } = {}): string {
  let s = raw
    .normalize("NFC")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
  if (!caseSensitive) s = s.toLowerCase();
  return s;
}

/*
 * Common contractions mapped to their full forms. Ambiguous forms ('s, 'd) map to
 * the A1–A2 meaning; content that needs the other meaning lists it in `accepted`.
 */
const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "that's": "that is",
  "there's": "there is",
  "what's": "what is",
  "where's": "where is",
  "who's": "who is",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "won't": "will not",
  "haven't": "have not",
  "hasn't": "has not",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'll": "i will",
  "you'll": "you will",
  "it'll": "it will",
};

/** Expand contractions in an already-normalized (lower-case) answer. */
export function expandContractions(normalized: string): string {
  return normalized
    .split(" ")
    .map((word) => {
      const m = word.match(/^([a-z']+)([,;:.!?]?)$/);
      if (!m) return word;
      return (CONTRACTIONS[m[1]] ?? m[1]) + m[2];
    })
    .join(" ")
    .replace(/\bcan not\b/g, "cannot");
}

function comparable(raw: string, spec: TextAnswerSpec): string {
  const normalized = normalizeAnswer(raw, { caseSensitive: spec.caseSensitive });
  return spec.contractionsEquivalent === false || spec.caseSensitive ? normalized : expandContractions(normalized);
}

export function checkTextAnswer(raw: string, spec: TextAnswerSpec): TextAnswerResult {
  const answer = comparable(raw, spec);
  if (answer === "") return { status: "empty" };

  const matched = spec.accepted.find((a) => comparable(a, spec) === answer);
  if (matched !== undefined) return { status: "correct", matched };

  const feedbackEntry = Object.entries(spec.wrongAnswerFeedback ?? {}).find(
    ([wrong]) => comparable(wrong, spec) === answer,
  );
  return { status: "incorrect", feedback: feedbackEntry?.[1] };
}
