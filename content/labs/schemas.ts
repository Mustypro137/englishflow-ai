/**
 * Schemas for skill-lab content (Milestone 7): listening, reading, writing,
 * pronunciation, conversation scenarios and the sentence studio.
 * Every file is validated against these by a unit test and by the seed script.
 */
import { z } from "zod";
import { cefrSchema, exerciseSchema, voiceSchema } from "../schemas";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slugs use lower-case words joined by hyphens.");
const text = z.string().trim().min(1);
const minutes = z.number().int().min(2).max(30);

const lower = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'");
/** Whole-word, case-insensitive search (so "car" doesn't match "card"). */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = lower(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(lower(haystack));
}

export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

const questionTypes = new Set(["multiple_choice", "short_answer", "gap_fill"]);

// --- Listening ---------------------------------------------------------------

export const listeningItemSchema = z
  .object({
    slug,
    level: cefrSchema,
    title: text,
    kind: z.enum(["dialogue", "monologue", "announcement", "voicemail"]),
    /** What the learner is about to hear, shown before listening. Never gives the answers away. */
    context: text,
    estimatedMinutes: minutes,
    speakers: z
      .array(z.object({ id: slug, name: text, voice: voiceSchema }))
      .min(1)
      .max(3),
    lines: z
      .array(z.object({ speaker: slug, text }))
      .min(2)
      .max(20),
    questions: z.array(exerciseSchema).min(3).max(6),
    /** Line numbers (0-based) used for dictation. */
    dictation: z.array(z.number().int().min(0)).min(1).max(4),
    /** Useful phrases to inspect after listening; each must appear in its line. */
    phrases: z
      .array(z.object({ line: z.number().int().min(0), text, meaning: text }))
      .min(2)
      .max(8),
  })
  .superRefine((item, ctx) => {
    const speakers = new Set(item.speakers.map((s) => s.id));
    item.lines.forEach((l, i) => {
      if (!speakers.has(l.speaker)) ctx.addIssue({ code: "custom", path: ["lines", i], message: "Unknown speaker." });
    });
    for (const d of item.dictation) {
      if (d >= item.lines.length) ctx.addIssue({ code: "custom", path: ["dictation"], message: `No line ${d}.` });
      else if (item.lines[d].text.split(/\s+/).length > 16)
        ctx.addIssue({ code: "custom", path: ["dictation"], message: `Line ${d} is too long for dictation.` });
    }
    item.phrases.forEach((p, i) => {
      const line = item.lines[p.line];
      if (!line || !containsPhrase(line.text, p.text))
        ctx.addIssue({ code: "custom", path: ["phrases", i], message: `"${p.text}" is not in line ${p.line}.` });
    });
    item.questions.forEach((q, i) => {
      if (q.skill !== "listening")
        ctx.addIssue({ code: "custom", path: ["questions", i], message: "Listening questions use skill listening." });
      if (!questionTypes.has(q.type))
        ctx.addIssue({ code: "custom", path: ["questions", i], message: `Type ${q.type} isn't used here.` });
      if (q.type === "multiple_choice" && (q.payload.passage || q.payload.listen))
        ctx.addIssue({ code: "custom", path: ["questions", i], message: "The transcript is shown separately." });
    });
  });
export type ListeningItem = z.infer<typeof listeningItemSchema>;

// --- Reading -----------------------------------------------------------------

export const READING_FOCUSES = ["comprehension", "inference", "vocabulary_in_context"] as const;

export const readingTextSchema = z
  .object({
    slug,
    level: cefrSchema,
    title: text,
    genre: z.enum(["story", "email", "article", "dialogue", "notice", "review", "message"]),
    /** One line shown in the library, without spoilers. */
    summary: text,
    estimatedMinutes: minutes,
    paragraphs: z.array(text).min(1).max(12),
    /** Words a learner might not know. `entry` links a vocabulary entry; otherwise it's saved as a flashcard. */
    glossary: z
      .array(z.object({ word: text, definition: text, entry: slug.optional() }))
      .min(2)
      .max(12),
    questions: z
      .array(z.object({ focus: z.enum(READING_FOCUSES), exercise: exerciseSchema }))
      .min(3)
      .max(8),
  })
  .superRefine((t, ctx) => {
    const body = t.paragraphs.join(" ");
    t.glossary.forEach((g, i) => {
      if (!containsPhrase(body, g.word))
        ctx.addIssue({ code: "custom", path: ["glossary", i], message: `"${g.word}" is not in the text.` });
    });
    if (new Set(t.glossary.map((g) => lower(g.word))).size !== t.glossary.length)
      ctx.addIssue({ code: "custom", path: ["glossary"], message: "Glossary words must be unique." });
    for (const focus of READING_FOCUSES) {
      if (!t.questions.some((q) => q.focus === focus))
        ctx.addIssue({ code: "custom", path: ["questions"], message: `Add at least one ${focus} question.` });
    }
    t.questions.forEach((q, i) => {
      if (q.exercise.skill !== "reading")
        ctx.addIssue({ code: "custom", path: ["questions", i], message: "Reading questions use skill reading." });
      if (!questionTypes.has(q.exercise.type))
        ctx.addIssue({ code: "custom", path: ["questions", i], message: `Type ${q.exercise.type} isn't used here.` });
    });
  });
export type ReadingText = z.infer<typeof readingTextSchema>;

/** The sentence of a text that contains a word: saved with the word as its context. */
export function sentenceContaining(paragraphs: readonly string[], word: string): string | null {
  for (const p of paragraphs) {
    const sentences = p.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) ?? [p];
    const hit = sentences.find((s) => containsPhrase(s, word));
    if (hit) return hit.trim();
  }
  return null;
}

// --- Writing -----------------------------------------------------------------

export const writingTaskSchema = z
  .object({
    slug,
    level: cefrSchema,
    title: text,
    genre: z.enum(["message", "email", "description", "story", "opinion", "review"]),
    prompt: text,
    /** What to include, as short points. */
    guidance: z.array(text).min(1).max(6),
    minWords: z.number().int().min(10),
    maxWords: z.number().int().max(400),
    /** Self-check list used with or without AI feedback. */
    checklist: z.array(text).min(2).max(8),
    modelAnswer: text,
    concepts: z.array(slug).default([]),
    estimatedMinutes: minutes,
  })
  .refine((t) => t.minWords < t.maxWords, "minWords must be less than maxWords.")
  .refine((t) => {
    const n = wordCount(t.modelAnswer);
    return n >= t.minWords && n <= t.maxWords;
  }, "The model answer must respect the word limits.");
export type WritingTask = z.infer<typeof writingTaskSchema>;

// --- Pronunciation -----------------------------------------------------------

const soundSchema = z.object({
  symbol: z.string().regex(/^\/.+\/$/, "Write sounds between slashes, e.g. /iː/."),
  name: text,
  /** How to make the sound, in plain words. */
  howTo: text,
});

/** The pair words found in a sentence: [words with the first sound, words with the second]. */
export function pairWordsIn(sentence: string, pairs: readonly (readonly [string, string])[]): [string[], string[]] {
  const first = [...new Set(pairs.map((p) => p[0]).filter((w) => containsPhrase(sentence, w)))];
  const second = [...new Set(pairs.map((p) => p[1]).filter((w) => containsPhrase(sentence, w)))];
  return [first, second];
}

export const minimalPairSetSchema = z
  .object({
    slug,
    level: cefrSchema,
    title: text,
    sounds: z.tuple([soundSchema, soundSchema]),
    tip: text,
    /** [word with the first sound, word with the second sound]. */
    pairs: z
      .array(z.tuple([text, text]))
      .min(4)
      .max(10),
    /** Sentences to say aloud (recording is optional). Each uses a word from both sides of the pairs. */
    sentences: z.array(text).min(1).max(4),
  })
  .superRefine((set, ctx) => {
    set.sentences.forEach((s, i) => {
      const [a, b] = pairWordsIn(s, set.pairs);
      if (a.length === 0 || b.length === 0)
        ctx.addIssue({
          code: "custom",
          path: ["sentences", i],
          message: "Each sentence needs a word with each sound from the pairs (for the text alternative).",
        });
    });
  });

export const stressSetSchema = z.object({
  slug,
  level: cefrSchema,
  title: text,
  explanation: text,
  items: z
    .array(
      z
        .object({ word: text, syllables: z.array(text).min(2).max(5), stressed: z.number().int().min(0) })
        .refine((i) => i.stressed < i.syllables.length, "The stressed syllable must exist.")
        .refine(
          (i) => i.syllables.join("").toLowerCase() === i.word.toLowerCase().replace(/[-\s]/g, ""),
          "Syllables must spell the word.",
        ),
    )
    .min(4)
    .max(12),
});

export const intonationSetSchema = z.object({
  slug,
  level: cefrSchema,
  title: text,
  explanation: text,
  items: z
    .array(z.object({ sentence: text, pattern: z.enum(["rise", "fall"]), why: text }))
    .min(4)
    .max(10),
});

export const pronunciationSchema = z
  .object({
    minimalPairs: z.array(minimalPairSetSchema).min(1),
    stress: z.array(stressSetSchema).min(1),
    intonation: z.array(intonationSetSchema).min(1),
  })
  .refine((p) => {
    const slugs = [...p.minimalPairs, ...p.stress, ...p.intonation].map((s) => s.slug);
    return new Set(slugs).size === slugs.length;
  }, "Pronunciation set slugs must be unique.");
export type PronunciationContent = z.infer<typeof pronunciationSchema>;
export type MinimalPairSet = z.infer<typeof minimalPairSetSchema>;
export type StressSet = z.infer<typeof stressSetSchema>;
export type IntonationSet = z.infer<typeof intonationSetSchema>;

// --- Conversation scenarios --------------------------------------------------

export const scenarioSchema = z.object({
  slug,
  level: cefrSchema,
  title: text,
  setting: text,
  learnerRole: text,
  partnerRole: text,
  partnerName: text,
  partnerVoice: voiceSchema,
  goals: z.array(text).min(2).max(5),
  usefulPhrases: z.array(text).min(3).max(10),
  /** The partner's first line, shown before the learner replies. */
  opening: text,
  /** A complete example conversation: always available, with or without AI. */
  modelDialogue: z
    .array(z.object({ speaker: z.enum(["partner", "learner"]), text }))
    .min(4)
    .max(16),
});
export type Scenario = z.infer<typeof scenarioSchema>;

// --- Sentence studio ---------------------------------------------------------

export const expansionTaskSchema = z
  .object({
    slug,
    level: cefrSchema,
    base: text,
    /** Each step adds one thing to the learner's previous sentence. */
    steps: z
      .array(z.object({ instruction: text, example: text }))
      .min(2)
      .max(4),
  })
  .refine(
    (t) => t.steps.every((s) => wordCount(s.example) > wordCount(t.base)),
    "Each example must be longer than the base sentence.",
  );
export type ExpansionTask = z.infer<typeof expansionTaskSchema>;

export const originalSentencePromptSchema = z.object({
  slug,
  level: cefrSchema,
  /** The pattern to use, e.g. "there is / there are". */
  pattern: text,
  prompt: text,
  examples: z.array(text).min(2).max(4),
  /** The sentence must contain one of these (checked automatically, case-insensitive). */
  mustIncludeOneOf: z.array(text).min(1),
  concept: slug,
});
export type OriginalSentencePrompt = z.infer<typeof originalSentencePromptSchema>;
