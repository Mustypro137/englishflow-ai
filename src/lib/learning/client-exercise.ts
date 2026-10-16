/**
 * The browser-safe view of an exercise: everything needed to show and answer it,
 * and nothing that reveals the answer (accepted answers, correct option, feedback, explanation).
 */
import { BLANK, type ExerciseContent, type PickExercise } from "@content/schemas";

interface ClientBase {
  id: string;
  type: ExerciseContent["type"];
  objective: string;
  instructions: string;
  hint: string | null;
  difficulty: number;
}

export type ClientExercise = ClientBase &
  (
    | {
        type: "multiple_choice";
        prompt: string;
        passage: { title: string; text: string } | null;
        options: { id: string; text: string }[];
      }
    | { type: "gap_fill"; segments: string[] }
    | { type: "sentence_completion"; stem: string }
    | { type: "short_answer"; prompt: string }
    | { type: "error_correction"; sentence: string }
    | { type: "transformation"; source: string; instruction: string }
    | { type: "word_order"; tokens: string[]; punctuation: string }
    | { type: "matching"; left: string[]; right: string[] }
  );

/** Small deterministic hash (FNV-1a) used to seed option shuffling. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Shuffle options in a stable order derived from a seed (the exercise slug), so the
 * position of the correct answer never follows a pattern, but stays the same on reload.
 */
export function stableShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function toClientExercise(
  exercise: PickExercise<"slug" | "objective" | "instructions" | "hint" | "difficulty"> & { id: string },
): ClientExercise {
  const base = {
    id: exercise.id,
    objective: exercise.objective,
    instructions: exercise.instructions,
    hint: exercise.hint ?? null,
    difficulty: exercise.difficulty,
  };
  switch (exercise.type) {
    case "multiple_choice": {
      const { prompt, passage, options } = exercise.payload;
      return {
        ...base,
        type: "multiple_choice",
        prompt,
        passage: passage ?? null,
        options: stableShuffle(options, exercise.slug),
      };
    }
    case "gap_fill":
      return { ...base, type: "gap_fill", segments: exercise.payload.text.split(BLANK) };
    case "sentence_completion":
      return { ...base, type: "sentence_completion", stem: exercise.payload.stem };
    case "short_answer":
      return { ...base, type: "short_answer", prompt: exercise.payload.prompt };
    case "error_correction":
      return { ...base, type: "error_correction", sentence: exercise.payload.sentence };
    case "transformation": {
      const { source, instruction } = exercise.payload;
      return { ...base, type: "transformation", source, instruction };
    }
    case "word_order": {
      const { tokens, punctuation } = exercise.payload;
      return { ...base, type: "word_order", tokens, punctuation };
    }
    case "matching": {
      const { pairs } = exercise.payload;
      // Right-hand options are sorted so their order never gives the answer away.
      const right = pairs.map((p) => p.right).sort((a, b) => a.localeCompare(b));
      return { ...base, type: "matching", left: pairs.map((p) => p.left), right };
    }
  }
}
