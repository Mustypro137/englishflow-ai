/**
 * Pick the next lesson to continue. A transparent rule (the full recommendation
 * engine arrives in Milestone 5): the first unfinished published lesson at or above
 * the learner's level; if none is written yet at that level, the first unfinished lesson overall.
 */
import { CEFR_CODES, type Cefr } from "@content/schemas";

interface LessonLike {
  id: string;
  status: "planned" | "published";
}
interface LevelLike<L extends LessonLike> {
  code: Cefr;
  modules: { units: { lessons: L[] }[] }[];
}

export interface NextLesson<L> {
  lesson: (L & { levelCode: Cefr }) | null;
  /** True when no lessons are written yet at or above the learner's level, so an earlier one is suggested. */
  belowLearnerLevel: boolean;
  allDone: boolean;
}

export function pickNextLesson<L extends LessonLike>(
  levels: LevelLike<L>[],
  completed: (lessonId: string) => boolean,
  learnerLevel: Cefr | null,
): NextLesson<L> {
  const ordered = levels.flatMap((level) =>
    level.modules.flatMap((m) =>
      m.units.flatMap((u) =>
        u.lessons.filter((l) => l.status === "published").map((l) => ({ ...l, levelCode: level.code })),
      ),
    ),
  );
  const unfinished = ordered.filter((l) => !completed(l.id));
  if (ordered.length > 0 && unfinished.length === 0) return { lesson: null, belowLearnerLevel: false, allDone: true };

  const minIndex = learnerLevel ? CEFR_CODES.indexOf(learnerLevel) : 0;
  const atLevel = unfinished.find((l) => CEFR_CODES.indexOf(l.levelCode) >= minIndex);
  if (atLevel) return { lesson: atLevel, belowLearnerLevel: false, allDone: false };
  return { lesson: unfinished[0] ?? null, belowLearnerLevel: unfinished.length > 0, allDone: false };
}
