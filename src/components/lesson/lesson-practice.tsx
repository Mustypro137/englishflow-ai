"use client";

import { CheckCircle2 } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { recordLessonViewAction } from "@/app/app/learn/actions";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import type { ExerciseHistory, LessonProgressSummary } from "@/server/db/learning-records";

const ProgressContext = createContext<{
  progress: LessonProgressSummary;
  setProgress: (p: LessonProgressSummary) => void;
} | null>(null);

/** Shares the lesson's answered/total count between the header and every exercise. */
export function LessonProgressProvider({
  lessonSlug,
  initial,
  children,
}: {
  lessonSlug: string;
  initial: LessonProgressSummary;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(initial);
  const recorded = useRef(false);
  useEffect(() => {
    // Count one view per visit (exposure only — never mastery).
    if (recorded.current) return;
    recorded.current = true;
    void recordLessonViewAction(lessonSlug);
  }, [lessonSlug]);
  return <ProgressContext value={{ progress, setProgress }}>{children}</ProgressContext>;
}

function useLessonProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useLessonProgress must be used inside LessonProgressProvider");
  return ctx;
}

export function LessonProgressBar() {
  const { progress } = useLessonProgress();
  const pct = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-ink font-medium" aria-live="polite">
          {progress.completed ? (
            <span className="text-success inline-flex items-center gap-1.5">
              <CheckCircle2 aria-hidden className="size-4" /> All {progress.total} exercises answered
            </span>
          ) : (
            `${progress.answered} of ${progress.total} exercises answered`
          )}
        </p>
        <p className="text-muted">{progress.correctFirstTry} correct on the first try</p>
      </div>
      <div
        role="progressbar"
        aria-label="Exercises answered"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.answered}
        className="bg-sunken h-2 overflow-hidden rounded-full"
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PracticeList({
  exercises,
  labelPrefix,
  allowHints,
  history,
}: {
  exercises: ClientExercise[];
  labelPrefix: string;
  allowHints: boolean;
  history: Record<string, ExerciseHistory>;
}) {
  const { setProgress } = useLessonProgress();
  return (
    <ol className="space-y-4">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <ExerciseCard
            exercise={ex}
            label={`${labelPrefix} ${i + 1} of ${exercises.length}`}
            allowHints={allowHints}
            history={history[ex.id]}
            onProgress={setProgress}
          />
        </li>
      ))}
    </ol>
  );
}
