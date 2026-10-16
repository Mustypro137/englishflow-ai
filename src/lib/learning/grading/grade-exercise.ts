/**
 * Deterministic grading for every exercise type. Runs on the server only, because
 * it needs the accepted answers, which are never sent to the browser before grading.
 */
import { z } from "zod";
import { BLANK, type PickExercise } from "@content/schemas";
import { checkTextAnswer, normalizeAnswer } from "./text-answer";

export type GradableExercise = PickExercise<"explanation">;

export interface GradeResult {
  correct: boolean;
  /** 0–1. Partial credit only where it is meaningful (matching, multi-blank gap fill). */
  score: number;
  /** Targeted explanation of this particular wrong answer, when the content has one. */
  feedback: string | null;
  /** The (first) correct answer, written out for display. */
  correctAnswer: string;
  explanation: string;
  /** Per-part correctness for multi-part exercises (blanks, matches). */
  parts?: boolean[];
}

export class InvalidResponseError extends Error {}

const textResponse = z.object({ answer: z.string().max(500) });

/** The shape the browser must send for each exercise type. */
export const responseSchemas = {
  multiple_choice: z.object({ optionId: z.string().max(50) }),
  gap_fill: z.object({ answers: z.array(z.string().max(200)).max(10) }),
  sentence_completion: textResponse,
  short_answer: textResponse,
  error_correction: textResponse,
  transformation: textResponse,
  word_order: z.object({ tokens: z.array(z.string().max(60)).max(12) }),
  matching: z.object({ matches: z.array(z.string().max(200)).max(8) }),
} as const;

function parseResponse<T extends keyof typeof responseSchemas>(type: T, response: unknown) {
  const parsed = responseSchemas[type].safeParse(response);
  if (!parsed.success) throw new InvalidResponseError(`Invalid response for ${type}.`);
  return parsed.data as z.infer<(typeof responseSchemas)[T]>;
}

function textResult(
  answer: string,
  spec: { accepted: readonly string[]; feedback?: Record<string, string>; exactContractions?: boolean },
  explanation: string,
  display: (a: string) => string = (a) => a,
): GradeResult {
  const { accepted } = spec;
  const r = checkTextAnswer(answer, {
    accepted,
    wrongAnswerFeedback: spec.feedback,
    contractionsEquivalent: !spec.exactContractions,
  });
  const correct = r.status === "correct";
  return {
    correct,
    score: correct ? 1 : 0,
    feedback: r.status === "incorrect" ? (r.feedback ?? null) : null,
    correctAnswer: display(accepted[0]),
    explanation,
  };
}

export function gradeExercise(exercise: GradableExercise, response: unknown): GradeResult {
  const { explanation } = exercise;
  switch (exercise.type) {
    case "multiple_choice": {
      const p = exercise.payload;
      const { optionId } = parseResponse("multiple_choice", response);
      if (!p.options.some((o) => o.id === optionId)) throw new InvalidResponseError("Unknown option.");
      const correct = optionId === p.correct;
      return {
        correct,
        score: correct ? 1 : 0,
        feedback: correct ? null : (p.optionFeedback?.[optionId] ?? null),
        correctAnswer: p.options.find((o) => o.id === p.correct)!.text,
        explanation,
      };
    }
    case "gap_fill": {
      const p = exercise.payload;
      const { answers } = parseResponse("gap_fill", response);
      if (answers.length !== p.blanks.length) throw new InvalidResponseError("Wrong number of blanks.");
      const results = p.blanks.map((blank, i) =>
        checkTextAnswer(answers[i], {
          accepted: blank.accepted,
          wrongAnswerFeedback: blank.feedback,
          contractionsEquivalent: !blank.exactContractions,
        }),
      );
      const parts = results.map((r) => r.status === "correct");
      const firstWrong = results.find((r) => r.status === "incorrect");
      const segments = p.text.split(BLANK);
      const filled = segments.reduce((acc, seg, i) => acc + seg + (p.blanks[i]?.accepted[0] ?? ""), "");
      return {
        correct: parts.every(Boolean),
        score: parts.filter(Boolean).length / parts.length,
        feedback: firstWrong?.status === "incorrect" ? (firstWrong.feedback ?? null) : null,
        correctAnswer: filled,
        explanation,
        parts,
      };
    }
    case "sentence_completion": {
      const p = exercise.payload;
      const { answer } = parseResponse("sentence_completion", response);
      return textResult(answer, p, explanation, (a) => `${p.stem} ${a}`);
    }
    case "short_answer":
    case "error_correction":
    case "transformation": {
      const p = exercise.payload;
      const { answer } = parseResponse(exercise.type, response);
      return textResult(answer, p, explanation);
    }
    case "word_order": {
      const p = exercise.payload;
      const { tokens } = parseResponse("word_order", response);
      const sameTokens = [...tokens].sort().join("|") === [...p.tokens].sort().join("|");
      if (!sameTokens) throw new InvalidResponseError("Use each word exactly once.");
      const sentence = normalizeAnswer(tokens.join(" "));
      const correct = p.accepted.some((a) => normalizeAnswer(a) === sentence);
      return {
        correct,
        score: correct ? 1 : 0,
        feedback: null,
        correctAnswer: `${capitalize(p.accepted[0])}${p.punctuation}`,
        explanation,
      };
    }
    case "matching": {
      const p = exercise.payload;
      const { matches } = parseResponse("matching", response);
      if (matches.length !== p.pairs.length) throw new InvalidResponseError("Match every item.");
      const parts = p.pairs.map((pair, i) => matches[i] === pair.right);
      return {
        correct: parts.every(Boolean),
        score: parts.filter(Boolean).length / parts.length,
        feedback: null,
        correctAnswer: p.pairs.map((pair) => `${pair.left} → ${pair.right}`).join("; "),
        explanation,
        parts,
      };
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
