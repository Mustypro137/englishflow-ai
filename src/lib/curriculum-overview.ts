/**
 * Public description of the CEFR levels and the current content status of each.
 * Update `contentStatus` as reviewed lessons are added — the curriculum page
 * reads it directly, so the site never claims content that does not exist.
 */

export type ContentStatus = "planned" | "in_development" | "partial" | "complete";

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  planned: "Planned",
  in_development: "In development",
  partial: "Partially available",
  complete: "Complete",
};

export interface LevelOverview {
  code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  name: string;
  band: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  focus: string[];
  contentStatus: ContentStatus;
}

export const LEVELS: readonly LevelOverview[] = [
  {
    code: "A1",
    name: "Beginner",
    band: "Beginner",
    summary:
      "Understand and use familiar everyday expressions and very basic phrases. Introduce yourself and ask simple questions.",
    focus: [
      "to be, pronouns and articles",
      "present simple",
      "high-frequency vocabulary",
      "simple questions and answers",
    ],
    contentStatus: "partial",
  },
  {
    code: "A2",
    name: "Elementary",
    band: "Beginner",
    summary: "Communicate in simple, routine tasks. Describe your background, surroundings and immediate needs.",
    focus: ["past simple", "comparatives", "countable and uncountable nouns", "everyday situations"],
    contentStatus: "planned",
  },
  {
    code: "B1",
    name: "Intermediate",
    band: "Intermediate",
    summary: "Deal with most situations while travelling. Describe experiences and give brief reasons for opinions.",
    focus: ["present perfect", "first and second conditionals", "phrasal verbs", "connected paragraphs"],
    contentStatus: "planned",
  },
  {
    code: "B2",
    name: "Upper intermediate",
    band: "Intermediate",
    summary: "Interact with fluency and spontaneity. Produce clear, detailed text and explain a viewpoint.",
    focus: ["passive voice", "reported speech", "collocations", "argument and comparison"],
    contentStatus: "planned",
  },
  {
    code: "C1",
    name: "Advanced",
    band: "Advanced",
    summary: "Use language flexibly for social, academic and professional purposes. Understand implicit meaning.",
    focus: ["advanced clause patterns", "register and tone", "hedging and nuance", "academic and workplace writing"],
    contentStatus: "planned",
  },
  {
    code: "C2",
    name: "Proficient",
    band: "Advanced",
    summary:
      "Understand virtually everything heard or read. Express yourself precisely, distinguishing fine shades of meaning.",
    focus: ["stylistic control", "idiomatic precision", "critical reading", "sophisticated argumentation"],
    contentStatus: "planned",
  },
];

export const SKILL_STRANDS: readonly { name: string; description: string }[] = [
  { name: "Grammar", description: "How sentences are built, taught in a sensible order with prerequisites." },
  { name: "Vocabulary", description: "Useful words and phrases by level, topic and function, always in context." },
  { name: "Listening", description: "From short, clear utterances to natural-speed conversation." },
  { name: "Reading", description: "Graded texts, from short dialogues to authentic articles." },
  { name: "Writing", description: "From single sentences to emails, summaries, opinions and essays." },
  {
    name: "Pronunciation",
    description: "Sounds, stress, rhythm and intonation — for being understood, not for copying an accent.",
  },
  { name: "Sentence construction", description: "Producing your own sentences instead of copying examples." },
  {
    name: "Communication",
    description: "Getting things done in real situations: asking, explaining, agreeing, disagreeing.",
  },
];
