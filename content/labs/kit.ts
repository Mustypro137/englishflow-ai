/**
 * Authoring helpers for skill-lab questions. The output is still validated
 * against content/schemas.ts and content/labs/schemas.ts.
 */
import type { ExerciseInput } from "../schemas";

type LabSkill = "listening" | "reading";
const IDS = ["a", "b", "c", "d"] as const;

export function questionKit(prefix: string, skill: LabSkill, difficulty = 1) {
  const objective = skill === "listening" ? "Understand what you hear." : "Understand what you read.";
  return {
    /** Multiple choice; `correct` is the index of the right option. */
    mc(
      id: string,
      prompt: string,
      options: [string, string, string] | [string, string, string, string],
      correct: number,
      explanation: string,
      optionFeedback?: Partial<Record<number, string>>,
    ): ExerciseInput {
      return {
        slug: `${prefix}-${id}`,
        type: "multiple_choice",
        objective,
        instructions: "Choose the best answer.",
        explanation,
        difficulty,
        skill,
        concepts: [],
        payload: {
          prompt,
          options: options.map((text, i) => ({ id: IDS[i], text })),
          correct: IDS[correct],
          optionFeedback: optionFeedback
            ? Object.fromEntries(Object.entries(optionFeedback).map(([i, f]) => [IDS[Number(i)], f as string]))
            : undefined,
        },
      };
    },
    /** A short typed answer. List every reasonable form in `accepted`. */
    short(id: string, prompt: string, accepted: [string, ...string[]], explanation: string): ExerciseInput {
      return {
        slug: `${prefix}-${id}`,
        type: "short_answer",
        objective,
        instructions: "Write a short answer.",
        explanation,
        difficulty,
        skill,
        concepts: [],
        payload: { prompt, accepted },
      };
    },
  };
}
