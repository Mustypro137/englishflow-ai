"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import { checkTextAnswer, type TextAnswerResult } from "@/lib/learning/grading/text-answer";
import { cn } from "@/lib/utils/cn";

const SPEC = {
  accepted: ["goes"],
  wrongAnswerFeedback: {
    go: "Close! With he, she or it in the present simple, the verb takes -s or -es: she goes.",
    gos: "Verbs ending in -o add -es, not -s: go → goes.",
    going: '"Going" needs a helping verb (she is going). For a daily habit, use the present simple: she goes.',
    "is going": 'That describes right now. "Every day" is a habit, so use the present simple: she goes.',
    went: '"Went" is past. "Every day" describes a present habit: she goes.',
  },
} as const;

const EXPLANATION =
  "We use the present simple for habits and routines. With he, she and it, add -s or -es to the verb. Go ends in -o, so it becomes goes.";

/**
 * A single, real active-recall exercise on the home page: the learner answers first,
 * then sees feedback and the explanation. Nothing is saved — saved practice arrives with lessons in Milestone 3.
 */
export function SampleExercise() {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<TextAnswerResult | null>(null);
  const [revealed, setRevealed] = useState(false);

  const submitted = result !== null && result.status !== "empty";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(checkTextAnswer(value, SPEC));
  }

  function reset() {
    setValue("");
    setResult(null);
    setRevealed(false);
  }

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="border-border bg-surface rounded-lg border p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${inputId}-title`} className="text-muted text-sm font-semibold tracking-wide uppercase">
          Try one now
        </h2>
        <span className="text-muted text-xs">A1 · Present simple</span>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <p className="text-ink font-serif text-xl leading-relaxed">
          She <span className="border-ink/40 inline-block min-w-16 border-b-2 text-center">&nbsp;</span> to work every
          day. <span className="text-muted">(go)</span>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={inputId}>Your answer</Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (result?.status === "empty") setResult(null);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={result?.status === "incorrect" ? true : undefined}
              aria-describedby={`${inputId}-feedback`}
              readOnly={result?.status === "correct"}
            />
            <Button type="submit" disabled={result?.status === "correct"}>
              Check
            </Button>
          </div>
        </div>
      </form>

      <div id={`${inputId}-feedback`} aria-live="polite" className="mt-4 min-h-6 text-sm">
        {result?.status === "empty" ? (
          <p className="text-muted">Type an answer first — trying before you look is what makes it stick.</p>
        ) : null}
        {result?.status === "correct" ? (
          <div className={cn("bg-success-soft text-ink rounded-md p-3")}>
            <p className="text-success font-semibold">Correct: she goes.</p>
            <p className="mt-1">{EXPLANATION}</p>
          </div>
        ) : null}
        {result?.status === "incorrect" ? (
          <div className="bg-danger-soft text-ink rounded-md p-3">
            <p className="text-danger font-semibold">Not quite.</p>
            <p className="mt-1">{result.feedback ?? "Think about who does the action and whether it is a habit."}</p>
            {revealed ? (
              <p className="mt-2">
                <span className="font-semibold">Answer: goes.</span> {EXPLANATION}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {submitted ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {result?.status === "incorrect" && !revealed ? (
            <Button variant="ghost" size="sm" onClick={() => setRevealed(true)}>
              Show answer
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      ) : null}

      <p className="text-muted mt-4 text-xs">This sample is not saved. Saved practice starts when lessons open.</p>
    </section>
  );
}
