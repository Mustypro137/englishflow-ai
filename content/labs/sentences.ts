/**
 * Sentence studio: expansion tasks (grow a simple sentence step by step) and
 * prompts for original sentences using a pattern from the lessons.
 * Written with AI assistance — pending review by an English teacher.
 */
import type { z } from "zod";
import type { expansionTaskSchema, originalSentencePromptSchema } from "./schemas";

const defineExpansions = (tasks: z.input<typeof expansionTaskSchema>[]) => tasks;
const definePrompts = (prompts: z.input<typeof originalSentencePromptSchema>[]) => prompts;

export const expansionTasks = defineExpansions([
  {
    slug: "a1-expand-i-drink-coffee",
    level: "A1",
    base: "I drink coffee.",
    steps: [
      { instruction: "Add when (every morning, at the weekend…).", example: "I drink coffee every morning." },
      { instruction: "Add where (at home, in a café…).", example: "I drink coffee at home every morning." },
      {
        instruction: "Add who with (with my sister, with friends…).",
        example: "I drink coffee with my sister at home every morning.",
      },
    ],
  },
  {
    slug: "a1-expand-she-works",
    level: "A1",
    base: "She works.",
    steps: [
      { instruction: "Add where she works (in a hospital, at a school…).", example: "She works in a hospital." },
      { instruction: "Add a time (at night, from nine to five…).", example: "She works in a hospital at night." },
      {
        instruction: "Add a reason with because.",
        example: "She works in a hospital at night because she likes it quiet.",
      },
    ],
  },
  {
    slug: "a1-expand-there-is-a-park",
    level: "A1",
    base: "There is a park.",
    steps: [
      { instruction: "Add an adjective (big, small, beautiful…).", example: "There is a big park." },
      {
        instruction: "Add where it is (near my house, opposite the station…).",
        example: "There is a big park near my house.",
      },
      {
        instruction: "Add a second sentence part with and or but.",
        example: "There is a big park near my house, but there isn't a café.",
      },
    ],
  },
  {
    slug: "a1-expand-we-play-football",
    level: "A1",
    base: "We play football.",
    steps: [
      { instruction: "Add how often (always, sometimes, every Sunday…).", example: "We sometimes play football." },
      { instruction: "Add where (in the park, at school…).", example: "We sometimes play football in the park." },
      {
        instruction: "Add a negative part with but … don't …",
        example: "We sometimes play football in the park, but we don't play in winter.",
      },
    ],
  },
]);

export const originalSentencePrompts = definePrompts([
  {
    slug: "a1-original-be",
    level: "A1",
    pattern: "I am / he is / they are",
    prompt: "Write a true sentence about a person you know, using is or are.",
    examples: ["My brother is a student in Madrid.", "My parents are very funny."],
    mustIncludeOneOf: ["is", "are", "'s", "'re"],
    concept: "be-present-positive",
  },
  {
    slug: "a1-original-there-is",
    level: "A1",
    pattern: "there is / there are",
    prompt: "Write a true sentence about your street or town using there is or there are.",
    examples: ["There's a small bakery opposite my flat.", "There are three bus stops in my street."],
    mustIncludeOneOf: ["there is", "there are", "there's", "there isn't", "there aren't"],
    concept: "there-is-there-are",
  },
  {
    slug: "a1-original-present-simple",
    level: "A1",
    pattern: "he / she + verb + -s",
    prompt: "Write a sentence about what a friend or family member does every day.",
    examples: ["My aunt walks to work every day.", "My friend Tom plays the guitar in the evening."],
    mustIncludeOneOf: ["he", "she", "my"],
    concept: "present-simple-third-person",
  },
  {
    slug: "a1-original-negative",
    level: "A1",
    pattern: "don't / doesn't",
    prompt: "Write a true sentence about something you or someone you know doesn't do.",
    examples: ["I don't drink coffee in the evening.", "My sister doesn't like football."],
    mustIncludeOneOf: ["don't", "doesn't", "do not", "does not"],
    concept: "present-simple-do-does",
  },
  {
    slug: "a1-original-can",
    level: "A1",
    pattern: "can / can't",
    prompt: "Write a sentence about something you can or can't do.",
    examples: ["I can swim, but I can't ski.", "My son can speak three languages."],
    mustIncludeOneOf: ["can", "can't", "cannot"],
    concept: "can-ability",
  },
]);
