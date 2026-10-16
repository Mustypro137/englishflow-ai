/**
 * A plain-data picture of one learner's situation, built on the server and passed
 * to the pure recommendation engine and planner. No database access here.
 */
import type { Cefr } from "@content/schemas";
import type { MasteryStateName } from "./mastery";

export type SkillName =
  | "grammar"
  | "vocabulary"
  | "listening"
  | "reading"
  | "writing"
  | "pronunciation"
  | "sentence_construction"
  | "functional_communication";

export interface SnapshotLesson {
  id: string;
  slug: string;
  title: string;
  objective: string;
  levelCode: Cefr;
  unitSlug: string;
  unitTitle: string;
  status: "planned" | "published";
  estimatedMinutes: number | null;
  conceptSlugs: string[];
  answered: number;
  total: number;
  completed: boolean;
  completedAt: Date | null;
}

export interface SnapshotConcept {
  slug: string;
  name: string;
  skill: SkillName;
  levelCode: Cefr;
  prerequisites: string[];
  state: MasteryStateName;
}

export interface LearnerSnapshot {
  now: Date;
  timezone: string;
  level: Cefr | null;
  goals: string[];
  reviewsDue: number;
  /** Concepts with unfixed mistakes, most first. */
  recurringMistakes: { conceptSlug: string; name: string; openMistakes: number }[];
  /** Curriculum order. */
  lessons: SnapshotLesson[];
  concepts: SnapshotConcept[];
  /** Answers given per skill in the last 14 days. */
  recentPracticeBySkill: Partial<Record<SkillName, number>>;
  savedWords: number;
  /** When the learner last did a mixed practice session, if ever. */
  lastMixedPracticeAt: Date | null;
}
