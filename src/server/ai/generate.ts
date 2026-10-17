import "server-only";
import { z } from "zod";
import { type ExerciseContent, lessonBlockSchema } from "@content/schemas";
import { AiError } from "@/lib/ai/errors";
import {
  conceptExercises,
  GENERATED_SET_SIZE,
  getGeneratableConcept,
  getGeneratedPractice,
  storeGeneratedExercises,
} from "@/server/db/generated";
import { buildGeneratedExercise, generationResponseSchema, hashOfContent } from "./exercises";
import { getAiProvider } from "./provider";
import { recordAiUsage, reserveAiRequest } from "./usage";

const SYSTEM = `You write practice exercises for EnglishFlow AI, an English course for adults (CEFR A1–C2).
Rules:
- Practise only the given concept, at the given CEFR level. Use vocabulary a learner at that level knows.
- Each exercise must have one clear, objectively checkable answer. List every correct variant in acceptedAnswers (for example with and without a contraction). If more than one answer could be natural, rewrite the question so it has one answer.
- Never invent grammar rules. Follow the lesson's explanation. Use standard English that is correct in both British and American English unless the concept says otherwise.
- wrongAnswers: two or three likely learner mistakes, each with a short reason. A wrong answer must never also be correct.
- Gap fill: the question contains exactly one ___ .
- Multiple choice: 3 or 4 options, exactly one correct; acceptedAnswers contains only the correct option's text.
- Error correction: the question is a sentence with exactly one error; acceptedAnswers are the corrected sentence.
- Keep everything short and plain text. No HTML, no Markdown.
- Don't copy the example exercises.`;

function lessonNotes(body: unknown): string {
  const parsed = z.array(lessonBlockSchema).safeParse(body);
  if (!parsed.success) return "";
  const lines: string[] = [];
  for (const b of parsed.data) {
    if (b.type === "rule") lines.push(`Rule: ${b.title ? `${b.title}. ` : ""}${b.text}`);
    if (b.type === "mistakes") for (const m of b.items) lines.push(`Common mistake: "${m.wrong}" → "${m.right}" (${m.why})`);
  }
  return lines.join("\n").replaceAll("**", "").slice(0, 2500);
}

function describeExample(e: ExerciseContent): string {
  switch (e.type) {
    case "multiple_choice":
      return `${e.type}: ${e.payload.prompt} [${e.payload.options.map((o) => o.text).join(" / ")}]`;
    case "gap_fill":
      return `${e.type}: ${e.payload.text}`;
    case "error_correction":
      return `${e.type}: ${e.payload.sentence}`;
    case "transformation":
      return `${e.type}: ${e.payload.source} (${e.payload.instruction})`;
    case "sentence_completion":
      return `${e.type}: ${e.payload.stem}`;
    default:
      return `${e.type}: ${e.objective}`;
  }
}

export interface GenerationOutcome {
  stored: number;
  rejected: number;
}

/**
 * Generate new practice for a concept. The model's output is validated item by item;
 * invalid, contradictory or duplicate items are dropped, and nothing is stored if none pass.
 */
export async function generatePractice(userId: string, conceptSlug: string): Promise<GenerationOutcome> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) throw new AiError("not_configured");
  const concept = await getGeneratableConcept(conceptSlug);
  if (!concept) throw new AiError("bad_request", "concept not available");

  // Reuse what's already cached before paying for new material.
  const { exercises: waiting } = await getGeneratedPractice(userId, concept.id);
  if (waiting.length >= GENERATED_SET_SIZE) return { stored: 0, rejected: 0 };

  await reserveAiRequest(userId);
  const existing = await conceptExercises(concept.id);
  const lesson = concept.lessons[0]?.lesson;
  const examples = existing
    .filter((e) => e.source === "seed")
    .slice(0, 4)
    .map((e) => `- ${describeExample(e.exercise)}`);
  const prompt = [
    `Concept: ${concept.name} (slug: ${concept.slug})`,
    `Level: ${concept.levelCode}`,
    `Description: ${concept.description}`,
    lesson ? `Lesson: ${lesson.title}. Objective: ${lesson.objective}` : "",
    lesson ? lessonNotes(lesson.body) : "",
    examples.length ? `Existing exercises (don't copy):\n${examples.join("\n")}` : "",
    `Write ${GENERATED_SET_SIZE} new exercises of mixed types. Use level "${concept.levelCode}" and conceptSlugs ["${concept.slug}"] for each.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, usage } = await provider.generateStructured(
    { system: SYSTEM, prompt, maxTokens: 4000 },
    generationResponseSchema,
  );
  await recordAiUsage(userId, usage);

  const known = new Set(existing.map((e) => e.contentHash ?? hashOfContent(e.exercise)));
  const valid: { exercise: ExerciseContent; hash: string }[] = [];
  let rejected = 0;
  for (const item of data.exercises.slice(0, GENERATED_SET_SIZE * 2)) {
    const built = buildGeneratedExercise(item, {
      conceptSlug: concept.slug,
      level: concept.levelCode,
      skill: concept.skill,
    });
    if (!built.ok || known.has(built.hash)) {
      rejected += 1;
      if (!built.ok) console.warn(`[generate] rejected an exercise: ${built.reason}`);
      continue;
    }
    known.add(built.hash);
    valid.push(built);
  }
  if (valid.length === 0) throw new AiError("invalid_output", "no generated exercise passed validation");
  const stored = await storeGeneratedExercises(concept.id, valid);
  return { stored, rejected: rejected + (valid.length - stored) };
}
