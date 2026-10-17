/**
 * Registry of learner-app modules.
 *
 * This is the single source of truth for navigation and for the public
 * "what exists / what's coming" pages. A module only appears in the app
 * navigation once its status is "available" — never as an empty placeholder.
 */

export type ModuleStatus = "planned" | "available";

export type ModuleIcon =
  | "dashboard"
  | "roadmap"
  | "grammar"
  | "vocabulary"
  | "review"
  | "listening"
  | "pronunciation"
  | "reading"
  | "writing"
  | "sentences"
  | "conversation"
  | "tutor"
  | "challenges"
  | "notebook"
  | "mistakes"
  | "progress"
  | "calendar"
  | "settings";

export type ModuleGroup = "study" | "skills" | "support" | "account";

export interface LearnerModule {
  id: string;
  label: string;
  href: "/app" | `/app/${string}`;
  description: string;
  icon: ModuleIcon;
  group: ModuleGroup;
  /** Roadmap milestone that delivers this module (see docs/DEVELOPMENT_ROADMAP.md). */
  milestone: number;
  status: ModuleStatus;
  /** Shown in the mobile bottom bar when available (max 4). */
  primaryOnMobile?: boolean;
}

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
  study: "Study",
  skills: "Skills",
  support: "Support",
  account: "Account",
};

export const MOBILE_PRIMARY_LIMIT = 4;

export const LEARNER_MODULES: readonly LearnerModule[] = [
  {
    id: "dashboard",
    label: "Today",
    href: "/app",
    description:
      "Your study plan for today, reviews due and the next recommended lesson — with the reason for each recommendation.",
    icon: "dashboard",
    group: "study",
    milestone: 5,
    status: "available",
    primaryOnMobile: true,
  },
  {
    id: "learn",
    label: "Curriculum",
    href: "/app/learn",
    description:
      "Your learning roadmap from A1 to C2, organised into modules, units and lessons with clear prerequisites.",
    icon: "roadmap",
    group: "study",
    milestone: 3,
    status: "available",
    primaryOnMobile: true,
  },
  {
    id: "review",
    label: "Review",
    href: "/app/review",
    description:
      "Active recall and spaced repetition: answer first, then check. Items return just before you are likely to forget them.",
    icon: "review",
    group: "study",
    milestone: 4,
    status: "available",
    primaryOnMobile: true,
  },
  {
    id: "grammar",
    label: "Grammar",
    href: "/app/grammar",
    description: "Every grammar topic by level, with how well you know each one and the lessons that teach it.",
    icon: "grammar",
    group: "study",
    milestone: 5,
    status: "available",
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    href: "/app/vocabulary",
    description:
      "Words taught in context with collocations, usage notes and recall practice — not just translation pairs.",
    icon: "vocabulary",
    group: "study",
    milestone: 4,
    status: "available",
  },
  {
    id: "challenges",
    label: "Challenges",
    href: "/app/challenges",
    description: "Daily and weekly tasks that reward independent use of English, such as writing original sentences.",
    icon: "challenges",
    group: "study",
    milestone: 5,
    status: "available",
  },
  {
    id: "listening",
    label: "Listening",
    href: "/app/listening",
    description:
      "Listen first, answer questions, then compare with the transcript and listen again. Includes dictation.",
    icon: "listening",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "reading",
    label: "Reading",
    href: "/app/reading",
    description:
      "Graded stories, dialogues and articles with comprehension questions. Save unfamiliar words as you read.",
    icon: "reading",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "writing",
    label: "Writing",
    href: "/app/writing",
    description:
      "Writing tasks with layered feedback: correctness, then naturalness, then optional style — and a rewrite step.",
    icon: "writing",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "sentences",
    label: "Sentence studio",
    href: "/app/sentences",
    description: "Build, expand and transform sentences until you can produce your own without copying an example.",
    icon: "sentences",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "pronunciation",
    label: "Pronunciation",
    href: "/app/pronunciation",
    description:
      "Sounds, minimal pairs, stress and intonation with model audio. Recording is optional and always explained.",
    icon: "pronunciation",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "conversation",
    label: "Conversation",
    href: "/app/conversation",
    description:
      "Real-life scenarios and role-plays — cafés, travel, work — in text, with replies read aloud if you like.",
    icon: "conversation",
    group: "skills",
    milestone: 7,
    status: "available",
  },
  {
    id: "tutor",
    label: "AI tutor",
    href: "/app/tutor",
    description: "A patient tutor that adapts to your level, gives hints before answers and explains your mistakes.",
    icon: "tutor",
    group: "support",
    milestone: 6,
    status: "available",
    primaryOnMobile: true,
  },
  {
    id: "notebook",
    label: "Notebook",
    href: "/app/notebook",
    description: "Saved words, grammar notes, sentences, bookmarks, a writing journal and your own flashcards.",
    icon: "notebook",
    group: "support",
    milestone: 4,
    status: "available",
  },
  {
    id: "mistakes",
    label: "Mistakes",
    href: "/app/mistakes",
    description: "Your recurring errors with corrections and explanations, used to recommend targeted practice.",
    icon: "mistakes",
    group: "support",
    milestone: 4,
    status: "available",
  },
  {
    id: "progress",
    label: "Progress",
    href: "/app/progress",
    description:
      "Skill-by-skill progress based on what you can recall and use independently — with an explanation of each measure.",
    icon: "progress",
    group: "support",
    milestone: 8,
    status: "available",
  },
  {
    id: "calendar",
    label: "Study calendar",
    href: "/app/calendar",
    description: "Planned and completed study sessions and your upcoming review load.",
    icon: "calendar",
    group: "support",
    milestone: 5,
    status: "available",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/app/settings",
    description: "Profile, learning preferences and accessibility options such as text size and reduced motion.",
    icon: "settings",
    group: "account",
    milestone: 2,
    status: "available",
  },
];

/** Modules shown in the learner-app navigation: only those that actually work. */
export function getNavModules(modules: readonly LearnerModule[] = LEARNER_MODULES): LearnerModule[] {
  return modules.filter((m) => m.status === "available");
}

/**
 * Split available modules into the mobile bottom bar and the "More" menu.
 * When everything fits in the bar, there is no "More" menu.
 */
export function splitMobileNav(modules: readonly LearnerModule[] = getNavModules()): {
  primary: LearnerModule[];
  more: LearnerModule[];
} {
  const available = modules.filter((m) => m.status === "available");
  if (available.length <= MOBILE_PRIMARY_LIMIT) return { primary: available, more: [] };
  const primary = available.filter((m) => m.primaryOnMobile).slice(0, MOBILE_PRIMARY_LIMIT);
  const primaryIds = new Set(primary.map((m) => m.id));
  return { primary, more: available.filter((m) => !primaryIds.has(m.id)) };
}

export function groupModules(
  modules: readonly LearnerModule[],
): { group: ModuleGroup; label: string; modules: LearnerModule[] }[] {
  return (Object.keys(MODULE_GROUP_LABELS) as ModuleGroup[])
    .map((group) => ({
      group,
      label: MODULE_GROUP_LABELS[group],
      modules: modules.filter((m) => m.group === group),
    }))
    .filter((g) => g.modules.length > 0);
}
