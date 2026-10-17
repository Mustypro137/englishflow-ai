/**
 * Daily study planner. Splits a session length into blocks, starting from the
 * 30-minute template (5 review · 7 new · 7 targeted · 6 listening/reading ·
 * 5 apply) and adapting it to what the learner actually needs today. Pure function.
 */
import type { SkillPick } from "@/lib/labs/pick";
import { nextLesson, type Recommendation } from "./recommend/engine";
import type { LearnerSnapshot } from "./snapshot";

export const SESSION_LENGTHS = [10, 20, 30, 60] as const;
export const MIN_SESSION = 5;
export const MAX_SESSION = 120;
const MIN_BLOCK = 2;

/** "vocabulary" only appears in plans saved before the listening and reading labs existed. */
export type BlockKind = "review" | "new_learning" | "targeted" | "skills" | "vocabulary" | "apply";

export interface PlanBlock {
  id: string;
  kind: BlockKind;
  minutes: number;
  title: string;
  description: string;
  href: string;
}

export interface SessionPlan {
  minutes: number;
  blocks: PlanBlock[];
  notes: string[];
}

/** Base shares from the 30-minute template in the specification. */
const TEMPLATE: Partial<Record<BlockKind, number>> = {
  review: 5,
  new_learning: 7,
  targeted: 7,
  skills: 6, // listening or reading
  apply: 5,
};

/** Round shares to whole minutes that add up exactly to the total (largest remainder). */
export function allocate(
  total: number,
  weights: Partial<Record<BlockKind, number>>,
): Partial<Record<BlockKind, number>> {
  const entries = Object.entries(weights).filter(([, w]) => (w ?? 0) > 0) as [BlockKind, number][];
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  if (sum === 0) return {};
  const raw = entries.map(([k, w]) => [k, (w / sum) * total] as const);
  const out = Object.fromEntries(raw.map(([k, v]) => [k, Math.floor(v)])) as Record<BlockKind, number>;
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  for (const [k] of [...raw].sort((a, b) => (b[1] % 1) - (a[1] % 1))) {
    if (left <= 0) break;
    out[k] += 1;
    left -= 1;
  }
  return out;
}

export function clampSessionMinutes(m: number): number {
  if (!Number.isFinite(m)) return 20;
  return Math.min(MAX_SESSION, Math.max(MIN_SESSION, Math.round(m)));
}

export function buildSessionPlan(
  rawMinutes: number,
  s: LearnerSnapshot,
  recs: Recommendation[],
  /** Today's listening or reading activity; without one, the time goes to vocabulary. */
  skillPick: SkillPick | null = null,
): SessionPlan {
  const minutes = clampSessionMinutes(rawMinutes);
  const notes: string[] = [];
  const weights: Partial<Record<BlockKind, number>> = { ...TEMPLATE };
  const { lesson } = nextLesson(s);
  const targeted = recs.find((r) => r.kind === "targeted" || r.kind === "prerequisite" || r.kind === "mixed_practice");
  const hasCompletedLesson = s.lessons.some((l) => l.status === "published" && l.completed);

  // Reviews: none due → give the time to new learning; a big backlog → more review.
  if (s.reviewsDue === 0) {
    weights.review = 0;
    notes.push("No reviews are due, so review time goes to new learning.");
  } else if (s.reviewsDue > 20) {
    weights.review = 12;
    notes.push(`You have ${s.reviewsDue} reviews due, so more of this session is review.`);
  }
  if (!lesson) {
    weights.new_learning = 0;
    notes.push("You've finished every lesson available so far.");
  }
  if (!targeted && !hasCompletedLesson) {
    weights.targeted = 0;
  }

  // Short sessions keep only the most valuable blocks.
  let alloc = allocate(minutes, weights);
  const order: BlockKind[] = ["apply", "skills", "targeted", "new_learning", "review"];
  while (Object.values(alloc).some((m) => (m ?? 0) > 0 && (m ?? 0) < MIN_BLOCK)) {
    const drop = order.find((k) => (alloc[k] ?? 0) > 0 && (alloc[k] ?? 0) < MIN_BLOCK);
    if (!drop) break;
    weights[drop] = 0;
    alloc = allocate(minutes, weights);
  }

  const blocks: PlanBlock[] = [];
  const add = (kind: BlockKind, title: string, description: string, href: string) => {
    const m = alloc[kind] ?? 0;
    if (m > 0) blocks.push({ id: kind, kind, minutes: m, title, description, href });
  };
  add(
    "review",
    "Review",
    `Answer the ${s.reviewsDue} due ${s.reviewsDue === 1 ? "item" : "items"} from memory before checking.`,
    "/app/review",
  );
  add(
    "new_learning",
    lesson ? `New: ${lesson.title}` : "New learning",
    lesson ? lesson.objective : "Continue with the next lesson.",
    lesson ? `/app/learn/${lesson.slug}` : "/app/learn",
  );
  add(
    "targeted",
    targeted ? targeted.title : "Mixed practice",
    targeted ? targeted.reason : "Practise topics you've already studied, mixed together.",
    targeted ? targeted.href : "/app/practice",
  );
  if (skillPick) add("skills", skillPick.title, skillPick.description, skillPick.href);
  else
    add(
      "skills",
      "Vocabulary",
      s.savedWords > 0 ? "Review your saved words, then save a few new ones." : "Save five useful words from a topic.",
      "/app/vocabulary",
    );
  add(
    "apply",
    "Use it",
    "Write a few sentences of your own with today's language (the lesson's “Use it” task or the writing challenge).",
    lesson ? `/app/learn/${lesson.slug}#apply` : "/app/challenges",
  );
  return { minutes, blocks, notes };
}
