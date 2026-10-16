/**
 * Turn a learner's response into readable text for the mistake tracker
 * (e.g. the option they chose, or the sentence they built). Pure function.
 */
import type { GradableExercise } from "./grade-exercise";

export function describeResponse(exercise: GradableExercise, response: unknown): string {
  const r = (response ?? {}) as Record<string, unknown>;
  switch (exercise.type) {
    case "multiple_choice":
      return exercise.payload.options.find((o) => o.id === r.optionId)?.text ?? "(no answer)";
    case "gap_fill": {
      const answers = Array.isArray(r.answers) ? (r.answers as string[]) : [];
      const segments = exercise.payload.text.split("___");
      return segments.reduce((acc, seg, i) => acc + seg + (i < answers.length ? `[${answers[i] || "…"}]` : ""), "");
    }
    case "word_order":
      return Array.isArray(r.tokens) ? (r.tokens as string[]).join(" ") : "(no answer)";
    case "matching": {
      const matches = Array.isArray(r.matches) ? (r.matches as string[]) : [];
      return exercise.payload.pairs.map((p, i) => `${p.left} → ${matches[i] || "?"}`).join("; ");
    }
    case "sentence_completion":
      return `${exercise.payload.stem} ${typeof r.answer === "string" ? r.answer : ""}`.trim();
    default:
      return typeof r.answer === "string" && r.answer.trim() ? r.answer : "(no answer)";
  }
}
