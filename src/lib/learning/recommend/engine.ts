/**
 * Transparent, rule-based recommendations. Each rule looks at the learner snapshot
 * and may suggest activities, each with a plain-language reason. Rules run in
 * priority order; the UI only renders the result, so the rules can evolve freely.
 *
 *  1. Reviews that are due
 *  2. Concepts with repeated mistakes
 *  3. Prerequisites blocking the next lesson
 *  4. Under-practised skills relevant to the learner's goals
 *  5. The next new lesson at the right level
 *  6. A mixed cumulative check after finishing a unit
 */
import { CEFR_CODES } from "@content/schemas";
import type { LearnerSnapshot, SkillName, SnapshotLesson } from "../snapshot";

export type RecommendationKind = "review" | "targeted" | "prerequisite" | "skill" | "lesson" | "mixed_practice";

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  href: string;
  reason: string;
  minutes: number;
  /** Higher comes first. */
  priority: number;
}

export const RECOMMENDATION_RULES_CONFIG = {
  repeatedMistakeThreshold: 2,
  underPractisedThreshold: 5,
  maxRecommendations: 5,
} as const;

/** Which skills each goal (chosen in onboarding) relies on most. */
export const GOAL_SKILLS: Record<string, SkillName[]> = {
  everyday: ["functional_communication", "vocabulary"],
  work: ["functional_communication", "writing", "vocabulary"],
  study: ["reading", "writing", "grammar"],
  travel: ["functional_communication", "vocabulary", "listening"],
  reading: ["reading", "vocabulary"],
  writing: ["writing", "sentence_construction"],
};

const SKILL_LABEL: Record<SkillName, string> = {
  grammar: "grammar",
  vocabulary: "vocabulary",
  listening: "listening",
  reading: "reading",
  writing: "writing",
  pronunciation: "pronunciation",
  sentence_construction: "sentence building",
  functional_communication: "everyday communication",
};

const published = (s: LearnerSnapshot) => s.lessons.filter((l) => l.status === "published");

/** First unfinished published lesson at or above the learner's level (or the first unfinished one). */
export function nextLesson(s: LearnerSnapshot): { lesson: SnapshotLesson | null; belowLevel: boolean } {
  const unfinished = published(s).filter((l) => !l.completed);
  const minIndex = s.level ? CEFR_CODES.indexOf(s.level) : 0;
  const atLevel = unfinished.find((l) => CEFR_CODES.indexOf(l.levelCode) >= minIndex);
  if (atLevel) return { lesson: atLevel, belowLevel: false };
  return { lesson: unfinished[0] ?? null, belowLevel: unfinished.length > 0 };
}

function lessonTeaching(s: LearnerSnapshot, conceptSlug: string): SnapshotLesson | undefined {
  return published(s).find((l) => l.conceptSlugs.includes(conceptSlug));
}

type Rule = (s: LearnerSnapshot) => Recommendation[];

export const ruleReviewsDue: Rule = (s) => {
  if (s.reviewsDue <= 0) return [];
  const n = s.reviewsDue;
  return [
    {
      kind: "review",
      title: `Review ${n} ${n === 1 ? "item" : "items"}`,
      href: "/app/review",
      reason: `${n} ${n === 1 ? "item is" : "items are"} due now. Recalling ${n === 1 ? "it" : "them"} before ${n === 1 ? "it fades" : "they fade"} is the most valuable thing you can do today.`,
      minutes: Math.min(15, Math.max(2, Math.ceil(n * 0.5))),
      priority: 100,
    },
  ];
};

export const ruleRepeatedMistakes: Rule = (s) =>
  s.recurringMistakes
    .filter((m) => m.openMistakes >= RECOMMENDATION_RULES_CONFIG.repeatedMistakeThreshold)
    .slice(0, 2)
    .flatMap((m) => {
      const lesson = lessonTeaching(s, m.conceptSlug);
      if (!lesson) return [];
      return [
        {
          kind: "targeted" as const,
          title: `Practise: ${m.name}`,
          href: `/app/learn/${lesson.slug}#guided`,
          reason: `You have ${m.openMistakes} unfixed mistakes with ${m.name}. A short focused practice will help it stick.`,
          minutes: 8,
          priority: 90,
        },
      ];
    });

export const rulePrerequisites: Rule = (s) => {
  const { lesson: next } = nextLesson(s);
  if (!next) return [];
  const conceptBySlug = new Map(s.concepts.map((c) => [c.slug, c]));
  const out: Recommendation[] = [];
  for (const slug of next.conceptSlugs) {
    for (const pre of conceptBySlug.get(slug)?.prerequisites ?? []) {
      const prereq = conceptBySlug.get(pre);
      if (!prereq || prereq.state === "practicing" || prereq.state === "mastered") continue;
      const teaching = lessonTeaching(s, pre);
      if (!teaching || teaching.completed || teaching.id === next.id) continue;
      out.push({
        kind: "prerequisite",
        title: teaching.title,
        href: `/app/learn/${teaching.slug}`,
        reason: `“${prereq.name}” is needed before “${next.title}”.`,
        minutes: teaching.estimatedMinutes ?? 15,
        priority: 80,
      });
    }
  }
  return out.slice(0, 1);
};

export const ruleUnderPractisedSkills: Rule = (s) => {
  const goalSkills = new Set(s.goals.flatMap((g) => GOAL_SKILLS[g] ?? []));
  // Only recommend skills that have a real activity today (no empty promises).
  if (goalSkills.has("vocabulary")) {
    const practised = s.recentPracticeBySkill.vocabulary ?? 0;
    if (practised < RECOMMENDATION_RULES_CONFIG.underPractisedThreshold) {
      return [
        {
          kind: "skill",
          title: s.savedWords > 0 ? "Practise your saved words" : "Save five new words",
          href: s.savedWords > 0 ? "/app/review" : "/app/vocabulary",
          reason: `Vocabulary matters for your goals, and you've practised it little in the last two weeks.`,
          minutes: 5,
          priority: 70,
        },
      ];
    }
  }
  if (goalSkills.has("sentence_construction") || goalSkills.has("writing")) {
    const practised = s.recentPracticeBySkill.sentence_construction ?? 0;
    if (practised < RECOMMENDATION_RULES_CONFIG.underPractisedThreshold && published(s).some((l) => l.completed)) {
      return [
        {
          kind: "skill",
          title: "Mixed sentence practice",
          href: "/app/practice",
          reason: `Building sentences supports your writing goal, and it hasn't had much practice lately.`,
          minutes: 8,
          priority: 70,
        },
      ];
    }
  }
  for (const skill of ["listening", "reading"] as const) {
    if (!goalSkills.has(skill)) continue;
    if ((s.recentPracticeBySkill[skill] ?? 0) < RECOMMENDATION_RULES_CONFIG.underPractisedThreshold) {
      return [
        {
          kind: "skill",
          title: skill === "listening" ? "Listening practice" : "Reading practice",
          href: `/app/${skill}`,
          reason: `${skill === "listening" ? "Listening" : "Reading"} matters for your goals, and you've practised it little in the last two weeks.`,
          minutes: 7,
          priority: 70,
        },
      ];
    }
  }
  return [];
};

export const ruleNextLesson: Rule = (s) => {
  const { lesson, belowLevel } = nextLesson(s);
  if (!lesson) return [];
  const started = lesson.answered > 0;
  return [
    {
      kind: "lesson",
      title: lesson.title,
      href: `/app/learn/${lesson.slug}`,
      reason: belowLevel
        ? `Lessons at your level (${s.level}) aren't written yet, so this is the next available lesson.`
        : started
          ? `You've answered ${lesson.answered} of ${lesson.total} exercises — finish it to complete the lesson.`
          : `Next in your path (${lesson.levelCode} · ${lesson.unitTitle}).`,
      minutes: lesson.estimatedMinutes ?? 15,
      priority: 60,
    },
  ];
};

export const ruleCumulativeCheck: Rule = (s) => {
  const units = new Map<string, { title: string; lessons: SnapshotLesson[] }>();
  for (const l of published(s)) {
    const u = units.get(l.unitSlug) ?? { title: l.unitTitle, lessons: [] };
    u.lessons.push(l);
    units.set(l.unitSlug, u);
  }
  for (const [slug, unit] of units) {
    if (!unit.lessons.every((l) => l.completed)) continue;
    const finishedAt = Math.max(...unit.lessons.map((l) => l.completedAt?.getTime() ?? 0));
    if (s.lastMixedPracticeAt && s.lastMixedPracticeAt.getTime() >= finishedAt) continue;
    return [
      {
        kind: "mixed_practice",
        title: `Mixed check: ${unit.title}`,
        href: `/app/practice?unit=${slug}`,
        reason: `You finished “${unit.title}”. Mixing its topics shows whether you can choose the right form without a hint.`,
        minutes: 10,
        priority: 50,
      },
    ];
  }
  return [];
};

export const RULES: readonly Rule[] = [
  ruleReviewsDue,
  ruleRepeatedMistakes,
  rulePrerequisites,
  ruleUnderPractisedSkills,
  ruleNextLesson,
  ruleCumulativeCheck,
];

export function recommend(s: LearnerSnapshot, limit: number = RECOMMENDATION_RULES_CONFIG.maxRecommendations) {
  const seen = new Set<string>();
  return RULES.flatMap((rule) => rule(s))
    .sort((a, b) => b.priority - a.priority)
    .filter((r) => {
      const key = r.href.split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export { SKILL_LABEL };
