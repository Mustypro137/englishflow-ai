/**
 * Schemas for curriculum content. Every content file is validated against these
 * by a unit test and again by the seed script, so invalid content never reaches learners.
 */
import { z } from "zod";

export const CEFR_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrSchema = z.enum(CEFR_CODES);
export type Cefr = z.infer<typeof cefrSchema>;

export const skillSchema = z.enum([
  "grammar",
  "vocabulary",
  "listening",
  "reading",
  "writing",
  "pronunciation",
  "sentence_construction",
  "functional_communication",
]);

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slugs use lower-case words joined by hyphens.");
const text = z.string().trim().min(1);

/** Wrong answer (as the learner might type it) → targeted explanation. */
const wrongAnswerFeedback = z.record(z.string(), text).optional();
const accepted = z.array(text).min(1);
/** Set when the exercise tests the contraction itself ("Yes, there is", not "Yes, there's"). */
const exactContractions = z.boolean().optional();

// --- Exercise payloads, one per type ----------------------------------------

export const multipleChoicePayload = z
  .object({
    prompt: text,
    /** Optional reading passage shown above the question (placement reading items). */
    passage: z.object({ title: text, text: text }).optional(),
    options: z
      .array(z.object({ id: z.string().min(1), text: text }))
      .min(2)
      .max(6),
    correct: z.string().min(1),
    optionFeedback: z.record(z.string(), text).optional(),
  })
  .refine((p) => p.options.some((o) => o.id === p.correct), "The correct option must be one of the options.")
  .refine((p) => new Set(p.options.map((o) => o.id)).size === p.options.length, "Option ids must be unique.")
  .refine(
    (p) => new Set(p.options.map((o) => o.text.toLowerCase())).size === p.options.length,
    "Option texts must be distinct.",
  );

export const BLANK = "___";
export const gapFillPayload = z
  .object({
    /** Sentence with one ___ per blank, e.g. "She ___ a teacher." */
    text: text,
    blanks: z.array(z.object({ accepted, feedback: wrongAnswerFeedback, exactContractions })).min(1),
  })
  .refine((p) => p.text.split(BLANK).length - 1 === p.blanks.length, "Number of ___ must equal number of blanks.");

export const sentenceCompletionPayload = z.object({
  /** Beginning of the sentence; the learner writes the ending. */
  stem: text,
  accepted,
  feedback: wrongAnswerFeedback,
  exactContractions,
});

export const shortAnswerPayload = z.object({
  prompt: text,
  accepted,
  feedback: wrongAnswerFeedback,
  exactContractions,
});

export const errorCorrectionPayload = z.object({
  /** Sentence containing exactly one error; the learner writes the corrected sentence. */
  sentence: text,
  accepted,
  feedback: wrongAnswerFeedback,
  exactContractions,
});

export const transformationPayload = z.object({
  source: text,
  /** What to do, e.g. "Make it negative." */
  instruction: text,
  accepted,
  feedback: wrongAnswerFeedback,
  exactContractions,
});

export const wordOrderPayload = z
  .object({
    /** Words in the (shuffled) order they are shown to the learner. */
    tokens: z.array(text).min(2).max(12),
    /** Accepted orders, written as sentences without final punctuation. */
    accepted,
    punctuation: z.enum([".", "?", "!"]),
  })
  .refine(
    (p) => p.accepted.every((a) => [...a.split(" ")].sort().join("|") === [...p.tokens].sort().join("|")),
    "Every accepted answer must use exactly the given tokens.",
  )
  .refine((p) => !p.accepted.includes(p.tokens.join(" ")), "Tokens must not already be in a correct order.");

export const matchingPayload = z
  .object({
    pairs: z
      .array(z.object({ left: text, right: text }))
      .min(2)
      .max(8),
  })
  .refine((p) => new Set(p.pairs.map((x) => x.left)).size === p.pairs.length, "Left items must be unique.")
  .refine((p) => new Set(p.pairs.map((x) => x.right)).size === p.pairs.length, "Right items must be unique.");

const exerciseBase = {
  slug,
  objective: text,
  instructions: text,
  /** Shown after answering, right or wrong. */
  explanation: text,
  /** Optional nudge available before answering (guided practice). */
  hint: text.optional(),
  difficulty: z.number().int().min(1).max(5),
  skill: skillSchema,
  /** Concepts practised. Required for lesson exercises (checked on the lesson), optional for placement. */
  concepts: z.array(slug).default([]),
};

export const exerciseSchema = z.discriminatedUnion("type", [
  z.object({ ...exerciseBase, type: z.literal("multiple_choice"), payload: multipleChoicePayload }),
  z.object({ ...exerciseBase, type: z.literal("gap_fill"), payload: gapFillPayload }),
  z.object({ ...exerciseBase, type: z.literal("sentence_completion"), payload: sentenceCompletionPayload }),
  z.object({ ...exerciseBase, type: z.literal("short_answer"), payload: shortAnswerPayload }),
  z.object({ ...exerciseBase, type: z.literal("error_correction"), payload: errorCorrectionPayload }),
  z.object({ ...exerciseBase, type: z.literal("transformation"), payload: transformationPayload }),
  z.object({ ...exerciseBase, type: z.literal("word_order"), payload: wordOrderPayload }),
  z.object({ ...exerciseBase, type: z.literal("matching"), payload: matchingPayload }),
]);
export type ExerciseContent = z.infer<typeof exerciseSchema>;
export type ExerciseTypeName = ExerciseContent["type"];

/** Pick fields from each exercise variant separately, keeping `type` and `payload` correlated. */
export type PickExercise<K extends keyof ExerciseContent> = ExerciseContent extends infer E
  ? E extends ExerciseContent
    ? Pick<E, K | "type" | "payload">
    : never
  : never;

// --- Lesson body -------------------------------------------------------------

/** Inline text may use **bold** for emphasis only. No HTML is ever rendered. */
export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text }),
  z.object({ type: z.literal("rule"), title: text.optional(), text }),
  z.object({
    type: z.literal("examples"),
    title: text.optional(),
    items: z.array(z.object({ text, note: text.optional() })).min(1),
  }),
  z.object({
    type: z.literal("table"),
    caption: text,
    headers: z.array(text).min(2),
    rows: z.array(z.array(text)).min(1),
  }),
  z.object({
    type: z.literal("mistakes"),
    items: z.array(z.object({ wrong: text, right: text, why: text })).min(1),
  }),
]);
export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export const applicationTaskSchema = z.object({
  prompt: text,
  modelAnswers: z.array(text).min(1),
  checklist: z.array(text).min(1),
});
export type ApplicationTask = z.infer<typeof applicationTaskSchema>;

export const publishedLessonSchema = z
  .object({
    slug,
    status: z.literal("published"),
    title: text,
    objective: text,
    estimatedMinutes: z.number().int().min(5).max(60),
    concepts: z.array(slug).min(1),
    body: z.array(lessonBlockSchema).min(2),
    guided: z.array(exerciseSchema).min(3),
    independent: z.array(exerciseSchema).min(3),
    recall: z.array(exerciseSchema).min(2),
    application: applicationTaskSchema,
    masteryCriteria: z.array(text).min(1),
  })
  .refine((l) => l.body.some((b) => b.type === "mistakes"), "Every lesson needs a common-mistakes block.")
  .refine((l) => l.body.some((b) => b.type === "examples"), "Every lesson needs examples.")
  .refine(
    (l) => [...l.guided, ...l.independent, ...l.recall].every((e) => e.concepts.length > 0),
    "Every lesson exercise must name at least one concept.",
  );

export const plannedLessonSchema = z.object({
  slug,
  status: z.literal("planned"),
  title: text,
  objective: text,
  concepts: z.array(slug).default([]),
});

export const lessonSchema = z.union([publishedLessonSchema, plannedLessonSchema]);
export type LessonContent = z.infer<typeof lessonSchema>;
export type PublishedLessonContent = z.infer<typeof publishedLessonSchema>;

export const conceptSchema = z.object({
  slug,
  name: text,
  description: text,
  skill: skillSchema,
  prerequisites: z.array(slug).default([]),
});
export type ConceptContent = z.infer<typeof conceptSchema>;

export const levelSchema = z.object({
  code: cefrSchema,
  title: text,
  description: text,
  concepts: z.array(conceptSchema),
  modules: z
    .array(
      z.object({
        slug,
        title: text,
        description: text,
        units: z.array(z.object({ slug, title: text, lessons: z.array(lessonSchema).min(1) })).min(1),
      }),
    )
    .min(1),
});
export type LevelContent = z.input<typeof levelSchema>;
export type ParsedLevel = z.output<typeof levelSchema>;

// --- Placement ---------------------------------------------------------------

export const PLACEMENT_SECTIONS = ["grammar", "vocabulary", "reading"] as const;
export const placementItemSchema = z
  .object({
    section: z.enum(PLACEMENT_SECTIONS),
    level: cefrSchema,
    exercise: exerciseSchema,
  })
  .refine((i) => i.exercise.type === "multiple_choice", "Placement items are multiple choice.");
export type PlacementItem = z.infer<typeof placementItemSchema>;

export type ExerciseInput = z.input<typeof exerciseSchema>;
export type PayloadFor<T extends ExerciseTypeName> = Extract<ExerciseInput, { type: T }>["payload"];

/** Helper for authoring with type checking. */
export const defineLevel = (level: LevelContent) => level;
export const definePlacement = (items: z.input<typeof placementItemSchema>[]) => items;
