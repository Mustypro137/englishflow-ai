/**
 * Three-layer writing feedback: correctness, naturalness and (optional) style.
 * The model fills a flat schema; `sanitizeFeedback` then keeps only items that point
 * at words the learner actually wrote, so feedback never invents text. Pure module.
 */
import { z } from "zod";

const str = z.string();
const change = z.object({ original: str, suggestion: str, explanation: str });

export const CORRECTION_CATEGORIES = ["grammar", "spelling", "punctuation", "word_choice", "word_order"] as const;

export const writingFeedbackResponseSchema = z.object({
  correctness: z.array(
    z.object({ original: str, corrected: str, explanation: str, category: z.enum(CORRECTION_CATEGORIES) }),
  ),
  naturalness: z.array(change),
  style: z.array(change),
  /** The learner's text with only the correctness fixes applied. */
  correctedText: str,
  /** One sentence confirming the meaning was kept, or naming what was unclear. */
  meaningCheck: str,
  summary: str,
  nextStep: str,
});
export type WritingFeedbackResponse = z.infer<typeof writingFeedbackResponseSchema>;

export interface FeedbackChange {
  original: string;
  suggestion: string;
  explanation: string;
}

export interface StoredFeedback {
  version: 1;
  correctness: (FeedbackChange & { category: (typeof CORRECTION_CATEGORIES)[number] })[];
  naturalness: FeedbackChange[];
  /** Null when the learner didn't ask for style suggestions. */
  style: FeedbackChange[] | null;
  /** Null when the model's corrected version didn't look like the learner's text. */
  correctedText: string | null;
  meaningCheck: string;
  summary: string;
  nextStep: string;
  /** Items removed because they didn't match the learner's text. */
  dropped: number;
}

export const storedFeedbackSchema: z.ZodType<StoredFeedback> = z.object({
  version: z.literal(1),
  correctness: z.array(
    z.object({ original: str, suggestion: str, explanation: str, category: z.enum(CORRECTION_CATEGORIES) }),
  ),
  naturalness: z.array(change),
  style: z.array(change).nullable(),
  correctedText: str.nullable(),
  meaningCheck: str,
  summary: str,
  nextStep: str,
  dropped: z.number().int(),
});

export const FEEDBACK_LIMITS = { correctness: 15, naturalness: 6, style: 4, field: 400, prose: 600 } as const;

const squash = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const clip = (s: string, max: number) => {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** True when `original` is something the learner wrote (spacing, apostrophes and case aside). */
export function appearsIn(text: string, original: string): boolean {
  const o = squash(original);
  return o.length > 0 && squash(text).toLowerCase().includes(o.toLowerCase());
}

function keepChanges<T extends FeedbackChange>(text: string, items: T[], max: number): { kept: T[]; dropped: number } {
  const kept: T[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw of items) {
    const item = {
      ...raw,
      original: clip(raw.original, FEEDBACK_LIMITS.field),
      suggestion: clip(raw.suggestion, FEEDBACK_LIMITS.field),
      explanation: clip(raw.explanation, FEEDBACK_LIMITS.field),
    };
    const key = squash(item.original).toLowerCase();
    const valid =
      appearsIn(text, item.original) &&
      item.suggestion.length > 0 &&
      item.explanation.length > 0 &&
      squash(item.original) !== squash(item.suggestion) &&
      !seen.has(key);
    if (!valid || kept.length >= max) {
      dropped++;
      continue;
    }
    seen.add(key);
    kept.push(item);
  }
  return { kept, dropped };
}

/** Keep only feedback that matches the learner's text; trim lengths; drop style unless requested. */
export function sanitizeFeedback(
  text: string,
  response: WritingFeedbackResponse,
  opts: { style: boolean },
): StoredFeedback {
  const correctness = keepChanges(
    text,
    response.correctness.map((c) => ({
      original: c.original,
      suggestion: c.corrected,
      explanation: c.explanation,
      category: c.category,
    })),
    FEEDBACK_LIMITS.correctness,
  );
  const naturalness = keepChanges(text, response.naturalness, FEEDBACK_LIMITS.naturalness);
  const style = opts.style ? keepChanges(text, response.style, FEEDBACK_LIMITS.style) : null;

  // The corrected version must still look like the learner's text: similar length,
  // and unchanged if there was nothing to correct.
  const corrected = response.correctedText.trim();
  const ratio = corrected.length / Math.max(1, text.trim().length);
  const correctedText =
    corrected && ratio >= 0.6 && ratio <= 1.6 && (correctness.kept.length > 0 || squash(corrected) === squash(text))
      ? corrected
      : null;

  return {
    version: 1,
    correctness: correctness.kept,
    naturalness: naturalness.kept,
    style: style ? style.kept : null,
    correctedText: correctness.kept.length > 0 ? correctedText : null,
    meaningCheck: clip(response.meaningCheck, FEEDBACK_LIMITS.prose),
    summary: clip(response.summary, FEEDBACK_LIMITS.prose),
    nextStep: clip(response.nextStep, FEEDBACK_LIMITS.prose),
    dropped: correctness.dropped + naturalness.dropped + (style?.dropped ?? 0),
  };
}
