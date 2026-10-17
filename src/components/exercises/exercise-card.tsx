"use client";

import { CheckCircle2, CircleAlert, Lightbulb, RotateCcw } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { submitAttemptAction } from "@/app/app/learn/actions";
import { useHydrated } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import type { GradeResult } from "@/lib/learning/grading/grade-exercise";
import type { ExerciseHistory, LessonProgressSummary } from "@/server/db/learning-records";
import { cn } from "@/lib/utils/cn";
import { type Answer, ExerciseInput, initialAnswer, isComplete, toResponse } from "./exercise-inputs";

/**
 * One exercise: answer first, then check. The server grades the answer and returns
 * feedback; the correct answer is only shown after a check (or on request after a mistake).
 */
export function ExerciseCard({
  exercise,
  label,
  allowHints,
  history,
  onProgress,
  onResult,
  context = "lesson",
}: {
  exercise: ClientExercise;
  label: string;
  allowHints: boolean;
  history?: ExerciseHistory;
  onProgress?: (p: LessonProgressSummary) => void;
  /** Called with each graded result (first and later tries). */
  onResult?: (r: GradeResult, independent: boolean) => void;
  /** "practice" for mixed practice of lessons already studied, "generated" for AI-generated practice, "lab" for skill labs. */
  context?: "lesson" | "practice" | "generated" | "lab";
}) {
  const idPrefix = useId();
  const hydrated = useHydrated();
  const [answer, setAnswer] = useState<Answer>(() => initialAnswer(exercise));
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string>();
  const [hintShown, setHintShown] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [everRevealed, setEverRevealed] = useState(false);
  const [pending, startTransition] = useTransition();

  const locked = result !== null || pending;
  const complete = isComplete(exercise, answer);

  function check() {
    if (!complete) {
      setError("Answer every part first — trying before you look is what makes it stick.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await submitAttemptAction({
        exerciseId: exercise.id,
        response: toResponse(exercise, answer),
        hintsUsed: hintShown ? 1 : 0,
        revealedAnswer: everRevealed,
        context,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.result);
      if (res.progress) onProgress?.(res.progress);
      onResult?.(res.result, !hintShown && !everRevealed);
    });
  }

  function tryAgain() {
    setResult(null);
    setRevealed(false);
    setError(undefined);
    if (exercise.type === "word_order") setAnswer(initialAnswer(exercise));
  }

  return (
    <article
      aria-labelledby={`${idPrefix}-label`}
      className="border-border bg-surface rounded-lg border p-5 shadow-sm sm:p-6"
      data-exercise-type={exercise.type}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${idPrefix}-label`} className="text-muted text-sm font-semibold">
          {label}
        </h3>
        {history ? (
          history.everCorrect ? (
            <Badge tone="success">Answered correctly before</Badge>
          ) : (
            <Badge tone="warning">Answered before — try again</Badge>
          )
        ) : null}
      </header>
      <p className="text-ink mt-2 text-sm font-medium">{exercise.instructions}</p>

      <form
        method="post"
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) check();
        }}
      >
        <ExerciseInput
          exercise={exercise}
          answer={answer}
          onChange={(a) => {
            setAnswer(a);
            setError(undefined);
          }}
          disabled={locked}
          idPrefix={idPrefix}
          parts={result?.parts}
        />

        {allowHints && exercise.hint && !result ? (
          hintShown ? (
            <p className="bg-accent-soft text-ink flex items-start gap-2 rounded-md p-3 text-sm">
              <Lightbulb aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-semibold">Hint: </span>
                {exercise.hint}
              </span>
            </p>
          ) : null
        ) : null}

        {!result ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!hydrated || pending}>
              {pending ? "Checking…" : "Check"}
            </Button>
            {allowHints && exercise.hint && !hintShown ? (
              <Button variant="ghost" disabled={!hydrated} onClick={() => setHintShown(true)}>
                <Lightbulb aria-hidden /> Show a hint
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>

      <div aria-live="polite" className="mt-4 empty:mt-0">
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        {result ? (
          <Feedback
            result={result}
            revealed={revealed}
            onReveal={() => {
              setRevealed(true);
              setEverRevealed(true);
            }}
          />
        ) : null}
      </div>

      {result ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={tryAgain}>
            <RotateCcw aria-hidden /> {result.correct ? "Practise again" : "Try again"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function Feedback({
  result,
  revealed,
  onReveal,
}: {
  result: GradeResult;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (result.correct) {
    return (
      <div className="bg-success-soft text-ink rounded-md p-4">
        <p className="text-success flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden className="size-5" /> Correct
        </p>
        <p className="mt-1">{result.explanation}</p>
      </div>
    );
  }
  const partial = result.parts && result.score > 0;
  return (
    <div className={cn("bg-danger-soft text-ink rounded-md p-4")}>
      <p className="text-danger flex items-center gap-2 font-semibold">
        <CircleAlert aria-hidden className="size-5" />
        {partial
          ? `Not quite — ${result.parts!.filter(Boolean).length} of ${result.parts!.length} correct`
          : "Not quite"}
      </p>
      <p className="mt-1">
        {result.feedback ?? "Look again at the rule and try once more before you check the answer."}
      </p>
      {revealed ? (
        <div className="border-danger/20 mt-3 border-t pt-3">
          <p>
            <span className="font-semibold">Answer: </span>
            {result.correctAnswer}
          </p>
          <p className="mt-1">{result.explanation}</p>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={onReveal}>
          Show the answer
        </Button>
      )}
    </div>
  );
}
