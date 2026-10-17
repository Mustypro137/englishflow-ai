import type { MasteryStateName } from "./mastery";
import type { SkillName } from "./snapshot";

/** How skills and mastery states are named to learners, everywhere they appear. */
export const SKILL_NAMES: Record<SkillName, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  pronunciation: "Pronunciation",
  sentence_construction: "Sentence building",
  functional_communication: "Everyday communication",
};

export const STATE_LABEL: Record<MasteryStateName, string> = {
  new: "Not started",
  learning: "Learning",
  practicing: "Practising",
  mastered: "Mastered",
};
