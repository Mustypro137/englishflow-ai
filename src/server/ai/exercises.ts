import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { BLANK, type Cefr, type ExerciseContent, exerciseSchema } from "@content/schemas";
import { gradeExercise } from "@/lib/learning/grading/grade-exercise";
import { normalizeAnswer } from "@/lib/learning/grading/text-answer";

/*
 * AI-generated exercises. The model fills a simple, flat schema; we then build a normal
 * curriculum exercise from it and run every check a seeded exercise must pass, plus
 * self-consistency checks with our own grader. Anything that fails is rejected.
 */

export const GENERATED_TYPES = [
  "multiple_choice",
  "gap_fill",
  "error_correction",
  "transformation",
  "sentence_completion",
] as const;

const str = z.string();
export const generatedExerciseSchema = z.object({
  type: z.enum(GENERATED_TYPES),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  conceptSlugs: z.array(str),
  objective: str,
  instructions: str,
  /** MC: the question. Gap fill: sentence with one ___. Error correction: the wrong sentence. Transformation: the source sentence. Sentence completion: the beginning. */
  question: str,
  /** Transformation only: what to do, e.g. "Make it negative." */
  transformInstruction: str.nullable(),
  /** Multiple choice only: 3 or 4 options. */
  options: z.array(str).nullable(),
  /** Every correct answer. Multiple choice: exactly the correct option's text. */
  acceptedAnswers: z.array(str),
  /** Likely wrong answers and why each is wrong. */
  wrongAnswers: z.array(z.object({ answer: str, why: str })),
  explanation: str,
  hint: str.nullable(),
  difficulty: z.number().int(),
});
export type GeneratedExercise = z.infer<typeof generatedExerciseSchema>;

export const generationResponseSchema = z.object({ exercises: z.array(generatedExerciseSchema) });

export interface GenerationTarget {
  conceptSlug: string;
  level: Cefr;
  skill: ExerciseContent["skill"];
}

export type BuildResult = { ok: true; exercise: ExerciseContent; hash: string } | { ok: false; reason: string };

const MAX_FIELD = 400;

/** Same question → same hash, regardless of case, spacing or option order. */
export function exerciseHash(type: string, question: string, options: string[] = []): string {
  const parts = [type, normalizeAnswer(question), ...options.map((o) => normalizeAnswer(o)).sort()];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** Hash of an existing (seeded or stored) exercise, for duplicate checks. */
export function hashOfContent(e: ExerciseContent): string {
  switch (e.type) {
    case "multiple_choice":
      return exerciseHash(
        e.type,
        e.payload.prompt,
        e.payload.options.map((o) => o.text),
      );
    case "gap_fill":
      return exerciseHash(e.type, e.payload.text);
    case "error_correction":
      return exerciseHash(e.type, e.payload.sentence);
    case "transformation":
      return exerciseHash(e.type, `${e.payload.source} ${e.payload.instruction}`);
    case "sentence_completion":
      return exerciseHash(e.type, e.payload.stem);
    case "short_answer":
      return exerciseHash(e.type, e.payload.prompt);
    case "word_order":
      return exerciseHash(e.type, [...e.payload.tokens].sort().join(" "));
    case "matching":
      return exerciseHash(e.type, e.payload.pairs.map((p) => `${p.left}=${p.right}`).join(";"));
  }
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const tooLong = (s: string) => s.length > MAX_FIELD;
const optionId = (i: number) => String.fromCharCode(97 + i); // a, b, c, d

function responseFor(e: ExerciseContent, answer: string): unknown {
  if (e.type === "multiple_choice") {
    const opt = e.payload.options.find((o) => normalizeAnswer(o.text) === normalizeAnswer(answer));
    return { optionId: opt?.id ?? "none" };
  }
  if (e.type === "gap_fill") return { answers: [answer] };
  return { answer };
}

/** Build and check one generated exercise. Pure. */
export function buildGeneratedExercise(item: GeneratedExercise, target: GenerationTarget): BuildResult {
  if (item.level !== target.level) return { ok: false, reason: "level does not match the concept" };
  if (item.conceptSlugs.length === 0 || item.conceptSlugs.some((s) => s !== target.conceptSlug)) {
    return { ok: false, reason: "unknown or unrelated concept" };
  }
  if (item.difficulty < 1 || item.difficulty > 5) return { ok: false, reason: "difficulty out of range" };
  const question = clean(item.question);
  const accepted = [...new Set(item.acceptedAnswers.map(clean).filter(Boolean))];
  const wrong = item.wrongAnswers.map((w) => ({ answer: clean(w.answer), why: clean(w.why) })).filter((w) => w.answer);
  const texts = [item.objective, item.instructions, question, item.explanation, item.hint ?? "", ...accepted];
  if (!question || accepted.length === 0) return { ok: false, reason: "missing question or accepted answer" };
  if (texts.some(tooLong) || wrong.some((w) => tooLong(w.answer) || tooLong(w.why))) {
    return { ok: false, reason: "text too long" };
  }
  if (/<[a-z/!]/i.test(texts.join(" "))) return { ok: false, reason: "contains markup" };

  const feedback = wrong.length ? Object.fromEntries(wrong.map((w) => [w.answer, w.why])) : undefined;
  let payload: unknown;
  let hash: string;
  switch (item.type) {
    case "multiple_choice": {
      const options = (item.options ?? []).map(clean);
      if (options.length < 3 || options.length > 4) return { ok: false, reason: "needs 3–4 options" };
      if (accepted.length !== 1) return { ok: false, reason: "multiple choice needs exactly one correct option" };
      const correct = options.findIndex((o) => normalizeAnswer(o) === normalizeAnswer(accepted[0]));
      if (correct < 0) return { ok: false, reason: "correct answer is not one of the options" };
      const optionFeedback: Record<string, string> = {};
      for (const w of wrong) {
        const i = options.findIndex((o) => normalizeAnswer(o) === normalizeAnswer(w.answer));
        if (i >= 0 && i !== correct) optionFeedback[optionId(i)] = w.why;
      }
      payload = {
        prompt: question,
        options: options.map((text, i) => ({ id: optionId(i), text })),
        correct: optionId(correct),
        ...(Object.keys(optionFeedback).length ? { optionFeedback } : {}),
      };
      hash = exerciseHash(item.type, question, options);
      break;
    }
    case "gap_fill":
      if (question.split(BLANK).length !== 2) return { ok: false, reason: "gap fill needs exactly one ___" };
      payload = { text: question, blanks: [{ accepted, feedback }] };
      hash = exerciseHash(item.type, question);
      break;
    case "error_correction":
      payload = { sentence: question, accepted, feedback };
      hash = exerciseHash(item.type, question);
      break;
    case "transformation": {
      const instruction = clean(item.transformInstruction ?? "");
      if (!instruction) return { ok: false, reason: "transformation needs an instruction" };
      payload = { source: question, instruction, accepted, feedback };
      hash = exerciseHash(item.type, `${question} ${instruction}`);
      break;
    }
    case "sentence_completion":
      payload = { stem: question, accepted, feedback };
      hash = exerciseHash(item.type, question);
      break;
  }

  const parsed = exerciseSchema.safeParse({
    slug: `ai-${hash.slice(0, 20)}`,
    type: item.type,
    objective: clean(item.objective),
    instructions: clean(item.instructions),
    explanation: clean(item.explanation),
    hint: item.hint ? clean(item.hint) : undefined,
    difficulty: item.difficulty,
    skill: target.skill,
    concepts: [target.conceptSlug],
    payload,
  });
  if (!parsed.success) return { ok: false, reason: parsed.error.issues[0]?.message ?? "invalid exercise" };
  const exercise = parsed.data;

  // Self-consistency with our own grader: every accepted answer must be marked correct,
  // and no "wrong answer" may be marked correct (that would be a contradiction).
  if (!accepted.every((a) => gradeExercise(exercise, responseFor(exercise, a)).correct)) {
    return { ok: false, reason: "an accepted answer is not graded as correct" };
  }
  if (wrong.some((w) => gradeExercise(exercise, responseFor(exercise, w.answer)).correct)) {
    return { ok: false, reason: "a wrong answer is also accepted" };
  }
  if (
    (item.type === "error_correction" || item.type === "transformation") &&
    gradeExercise(exercise, { answer: question }).correct
  ) {
    return { ok: false, reason: "the sentence is already correct as given" };
  }
  return { ok: true, exercise, hash };
}
