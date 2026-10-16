/**
 * Browser-safe shapes for review cards. Graded cards (exercises, word recall)
 * never include their answers; self-rated cards (recognition, flashcards) do,
 * because the learner reveals and judges the answer themselves.
 */
import type { ClientExercise } from "./client-exercise";
import type { Rating } from "./srs/scheduler";

export type ReviewCardView =
  | { id: string; kind: "exercise"; exercise: ClientExercise; lesson: { slug: string; title: string } | null }
  | {
      id: string;
      kind: "word_recall";
      word: { partOfSpeech: string; topic: string; definition: string };
      /** Sentence split around the gap: [before, after]. */
      cloze: [string, string];
    }
  | {
      id: string;
      kind: "word_recognise";
      word: {
        headword: string;
        partOfSpeech: string;
        ipa: string | null;
        definition: string;
        examples: string[];
        collocations: string[];
        usageNote: string | null;
      };
    }
  | { id: string; kind: "flashcard"; front: string; back: string; note: string | null };

/** Saved words alternate direction: even repetitions ask for the word, odd ones show it. */
export function vocabularyMode(reps: number): "word_recall" | "word_recognise" {
  return reps % 2 === 0 ? "word_recall" : "word_recognise";
}

export const SELF_RATED_KINDS = ["word_recognise", "flashcard"] as const;
export const RATINGS: readonly Rating[] = ["again", "hard", "good", "easy"];
