/** Tutor modes (master prompt §10). Browser-safe: labels and short instructions only. */
export const TUTOR_MODES = [
  "explain",
  "understand_sentence",
  "conversation",
  "correct_writing",
  "vocabulary",
  "quiz",
  "remember",
  "listening",
  "build_sentences",
  "challenge",
  "explain_mistakes",
  "review_history",
] as const;
export type TutorModeName = (typeof TUTOR_MODES)[number];

export interface TutorModeInfo {
  label: string;
  /** Shown under the mode name. */
  description: string;
  /** Placeholder for the first message. */
  placeholder: string;
  /** Mode-specific instruction for the model. */
  instruction: string;
}

export const TUTOR_MODE_INFO: Record<TutorModeName, TutorModeInfo> = {
  explain: {
    label: "Explain a concept",
    description: "Ask about a grammar point, word or rule.",
    placeholder: "e.g. When do I use “the”?",
    instruction:
      "Explain the concept the learner asks about: the rule, two or three examples, and one common mistake. Then ask the learner to try one example themselves.",
  },
  understand_sentence: {
    label: "Understand a sentence",
    description: "Paste a sentence you don't fully understand.",
    placeholder: "Paste the sentence here",
    instruction:
      "Help the learner understand the sentence they give: meaning, structure and any idioms. Say what is grammatical, and point out any parts that are informal or regional.",
  },
  conversation: {
    label: "Practise conversation",
    description: "Have a short conversation at your level.",
    placeholder: "e.g. Let's talk about my weekend.",
    instruction:
      "Hold a natural conversation at the learner's level. Keep your turns short and end each one with a question. After each learner turn, briefly note at most one important error with a correction, then continue the conversation.",
  },
  correct_writing: {
    label: "Correct my writing",
    description: "Get corrections with explanations.",
    placeholder: "Paste your text here",
    instruction:
      "Correct the learner's text in layers: first errors (grammar, spelling, word choice) with a short reason for each, then naturalness. Keep the learner's meaning. Clearly separate real errors from acceptable alternatives. When several corrections are valid, say so.",
  },
  vocabulary: {
    label: "Teach me vocabulary",
    description: "Learn words for a topic, in context.",
    placeholder: "e.g. Words for talking about the weather",
    instruction:
      "Teach a small set of words (at most six) for the learner's topic, each with meaning, a natural example sentence and a common collocation. Then ask the learner to use two of them in their own sentences.",
  },
  quiz: {
    label: "Quiz me",
    description: "Answer questions one at a time.",
    placeholder: "e.g. Quiz me on the past simple",
    instruction:
      "Quiz the learner one question at a time. Wait for their answer before giving feedback. Say whether it is correct, explain briefly, then ask the next question.",
  },
  remember: {
    label: "Help me remember",
    description: "Memory techniques and recall practice.",
    placeholder: "e.g. I keep forgetting irregular verbs",
    instruction:
      "Help the learner remember: suggest a technique that fits the item, then make them recall it actively (ask, wait, check) instead of just repeating the rule.",
  },
  listening: {
    label: "Listening practice (text)",
    description: "Practise understanding spoken English, as text.",
    placeholder: "e.g. Give me a short dialogue at a café",
    instruction:
      "There is no audio in this mode. Write a short, natural spoken dialogue as a transcript, then ask comprehension questions one at a time. Say plainly that this is reading a transcript, not real listening practice.",
  },
  build_sentences: {
    label: "Build sentences",
    description: "Make sentences step by step.",
    placeholder: "e.g. Help me write sentences about my job",
    instruction:
      "Guide the learner to build their own sentences step by step: give a frame or prompt, let them write, then correct and suggest one way to expand the sentence. Don't write the sentences for them.",
  },
  challenge: {
    label: "Give me a challenge",
    description: "A short task slightly above your level.",
    placeholder: "e.g. Something to practise in five minutes",
    instruction:
      "Set one short, concrete task slightly above the learner's level, explain what success looks like, and wait for their attempt before giving feedback.",
  },
  explain_mistakes: {
    label: "Explain my mistakes",
    description: "Understand errors from your practice.",
    placeholder: "e.g. Why was my answer wrong?",
    instruction:
      "Explain the learner's mistakes: what was wrong, why, and the rule behind it. Use the mistakes listed in the learning context when they are available. Then give one similar item for the learner to try.",
  },
  review_history: {
    label: "Review my learning",
    description: "Look back at what you've studied.",
    placeholder: "e.g. What should I work on next?",
    instruction:
      "Review the learner's progress using only the learning context provided. Never invent numbers or history. If the context is empty or sharing is off, say so and suggest what the learner could tell you instead.",
  },
};

export function isTutorMode(value: unknown): value is TutorModeName {
  return typeof value === "string" && (TUTOR_MODES as readonly string[]).includes(value);
}
