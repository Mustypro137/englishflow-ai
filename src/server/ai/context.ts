import "server-only";

/*
 * Learning context for the tutor. Only the fields listed in TutorContext are ever
 * sent to the model — never ids, emails, the full history or unconfirmed memories.
 */

export interface TutorContext {
  level: string | null;
  /** How the level was set: "placement", "self_reported", "assessment" or null. */
  levelSource: string | null;
  lesson: { title: string; objective: string } | null;
  /** Present only when the learner allows the tutor to use their learning history. */
  history: {
    recentAttempts: { task: string; answer: string; correct: boolean }[];
    misconceptions: { concept: string; wrong: string; correct: string; times: number }[];
    vocabulary: string[];
    progress: { mastered: number; practicing: number; learning: number };
    memories: { kind: string; content: string }[];
  } | null;
}

/** Raw records as loaded from the database (they may carry more fields than are allowed). */
export interface ContextRecords {
  profile: { estimatedLevel: string | null; selfReportedLevel: string | null; levelSource: string | null } | null;
  sharing: boolean;
  lesson: { title: string; objective: string } | null;
  attempts: { objective: string; answer: string; isCorrect: boolean }[];
  mistakes: { conceptName: string | null; originalAnswer: string; correctAnswer: string }[];
  savedWords: { word: string }[];
  conceptStates: string[];
  memories: { kind: string; content: string; verified: boolean }[];
}

const LIMITS = { attempts: 5, misconceptions: 3, vocabulary: 8, memories: 10, text: 160 };
const clip = (s: string) => (s.length > LIMITS.text ? `${s.slice(0, LIMITS.text - 1)}…` : s);

/** Pick the minimal, allowed context. Pure: unit-tested to include nothing else. */
export function selectContext(r: ContextRecords): TutorContext {
  const level = r.profile?.estimatedLevel ?? r.profile?.selfReportedLevel ?? null;
  const base = {
    level,
    levelSource: r.profile?.estimatedLevel
      ? r.profile.levelSource
      : r.profile?.selfReportedLevel
        ? "self_reported"
        : null,
    lesson: r.lesson ? { title: clip(r.lesson.title), objective: clip(r.lesson.objective) } : null,
  };
  if (!r.sharing) return { ...base, history: null };

  const byConcept = new Map<string, { concept: string; wrong: string; correct: string; times: number }>();
  for (const m of r.mistakes) {
    const key = m.conceptName ?? "Other";
    const e = byConcept.get(key);
    if (e) e.times += 1;
    else byConcept.set(key, { concept: key, wrong: clip(m.originalAnswer), correct: clip(m.correctAnswer), times: 1 });
  }
  const count = (s: string) => r.conceptStates.filter((c) => c === s).length;
  return {
    ...base,
    history: {
      recentAttempts: r.attempts
        .slice(0, LIMITS.attempts)
        .map((a) => ({ task: clip(a.objective), answer: clip(a.answer), correct: a.isCorrect })),
      misconceptions: [...byConcept.values()].sort((a, b) => b.times - a.times).slice(0, LIMITS.misconceptions),
      vocabulary: r.savedWords.slice(0, LIMITS.vocabulary).map((w) => clip(w.word)),
      progress: { mastered: count("mastered"), practicing: count("practicing"), learning: count("learning") },
      // Unconfirmed AI suggestions are never treated as facts about the learner.
      memories: r.memories
        .filter((m) => m.verified)
        .slice(0, LIMITS.memories)
        .map((m) => ({ kind: m.kind, content: clip(m.content) })),
    },
  };
}

/** Context as text for the system prompt, marked as data rather than instructions. */
export function formatContext(ctx: TutorContext): string {
  const lines: string[] = [];
  const source =
    ctx.levelSource === "placement"
      ? "estimated from a short placement check"
      : ctx.levelSource === "self_reported"
        ? "the learner's own estimate"
        : ctx.levelSource === "assessment"
          ? "from an assessment"
          : null;
  lines.push(ctx.level ? `Working level: ${ctx.level}${source ? ` (${source})` : ""}.` : "Working level: unknown.");
  if (ctx.lesson) lines.push(`Current lesson: ${ctx.lesson.title}. Objective: ${ctx.lesson.objective}`);
  if (!ctx.history) {
    lines.push("The learner has not shared their learning history. Don't guess it; ask if you need to know.");
    return lines.join("\n");
  }
  const h = ctx.history;
  lines.push(
    `Concepts: ${h.progress.mastered} mastered, ${h.progress.practicing} practising, ${h.progress.learning} learning.`,
  );
  if (h.recentAttempts.length) {
    lines.push("Recent answers:");
    for (const a of h.recentAttempts)
      lines.push(`- ${a.task} — answered "${a.answer}" (${a.correct ? "correct" : "wrong"})`);
  }
  if (h.misconceptions.length) {
    lines.push("Recurring mistakes not yet fixed:");
    for (const m of h.misconceptions) {
      lines.push(`- ${m.concept}: wrote "${m.wrong}", correct "${m.correct}" (${m.times}×)`);
    }
  }
  if (h.vocabulary.length) lines.push(`Recently saved words: ${h.vocabulary.join(", ")}`);
  if (h.memories.length) {
    lines.push("Confirmed notes from the learner:");
    for (const m of h.memories) lines.push(`- (${m.kind.replace("_", " ")}) ${m.content}`);
  }
  return lines.join("\n");
}
