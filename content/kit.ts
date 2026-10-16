/**
 * Small authoring helpers so lesson files stay readable.
 * Everything they produce is still validated against content/schemas.ts.
 */
import type { ExerciseInput, ExerciseTypeName, PayloadFor } from "./schemas";

type Skill = ExerciseInput["skill"];

interface ExerciseFields<T extends ExerciseTypeName> {
  instructions: string;
  explanation: string;
  payload: PayloadFor<T>;
  hint?: string;
  difficulty?: number;
  objective?: string;
  concepts?: string[];
  skill?: Skill;
}

/**
 * Create exercises for one lesson. Slugs become `${prefix}-${id}`, and the
 * lesson's objective, concepts and skill are used unless an exercise overrides them.
 */
export function exerciseKit(defaults: { prefix: string; objective: string; concepts: string[]; skill?: Skill }) {
  return function exercise<T extends ExerciseTypeName>(type: T, id: string, fields: ExerciseFields<T>): ExerciseInput {
    return {
      slug: `${defaults.prefix}-${id}`,
      type,
      objective: fields.objective ?? defaults.objective,
      instructions: fields.instructions,
      explanation: fields.explanation,
      hint: fields.hint,
      difficulty: fields.difficulty ?? 1,
      skill: fields.skill ?? defaults.skill ?? "grammar",
      concepts: fields.concepts ?? defaults.concepts,
      payload: fields.payload,
    } as ExerciseInput;
  };
}

/** A lesson that is on the roadmap but not written yet. */
export function planned(slug: string, title: string, objective: string, concepts: string[] = []) {
  return { slug, status: "planned" as const, title, objective, concepts };
}
