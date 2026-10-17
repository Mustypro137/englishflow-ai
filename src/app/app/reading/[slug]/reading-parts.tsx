"use client";

import { ArrowRight, BookmarkCheck, BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { useHydrated } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { type CompleteReadingResult, completeReadingAction, saveReadingWordAction } from "../actions";

export function GlossarySaveButton({
  textSlug,
  word,
  initiallySaved,
}: {
  textSlug: string;
  word: string;
  initiallySaved: boolean;
}) {
  const hydrated = useHydrated();
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={saved ? "secondary" : "primary"}
        disabled={!hydrated || pending || saved}
        aria-label={saved ? `“${word}” is saved` : `Save “${word}” with its sentence`}
        onClick={() =>
          startTransition(async () => {
            const res = await saveReadingWordAction(textSlug, word);
            if (res.saved) {
              setSaved(true);
              setMessage(res.saved === "word" ? "Saved to your words" : "Saved as a flashcard");
            } else setMessage("Couldn't save. Try again.");
          })
        }
      >
        {saved ? <BookmarkCheck aria-hidden /> : <BookmarkPlus aria-hidden />}
        {saved ? "Saved" : "Save"}
      </Button>
      <span role="status" className="text-muted text-xs">
        {message}
      </span>
    </div>
  );
}

export function ReadingQuestions({
  textSlug,
  questions,
  expected,
  next,
}: {
  textSlug: string;
  questions: { exercise: ClientExercise; focus: string | null }[];
  expected: number;
  next: { slug: string; title: string } | null;
}) {
  const hydrated = useHydrated();
  const [first, setFirst] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<CompleteReadingResult | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = Object.keys(first).length;
  const allAnswered = questions.length > 0 && answered >= questions.length;

  return (
    <section aria-labelledby="questions-heading" className="space-y-4">
      <h2 id="questions-heading" className="text-ink text-lg font-semibold">
        Questions
      </h2>
      {questions.length < expected ? (
        <Alert tone="warning" title="Some questions aren't available yet">
          The questions for this text haven&apos;t been loaded on this site yet. You can still read and save words.
        </Alert>
      ) : (
        <p className="text-muted text-sm">You can look back at the text while you answer.</p>
      )}
      <ol className="space-y-6">
        {questions.map(({ exercise, focus }, i) => (
          <li key={exercise.id}>
            <ExerciseCard
              exercise={exercise}
              label={`Question ${i + 1} of ${questions.length}${focus ? ` · ${focus}` : ""}`}
              allowHints={false}
              context="lab"
              onResult={(r) => setFirst((prev) => (exercise.id in prev ? prev : { ...prev, [exercise.id]: r.correct }))}
            />
          </li>
        ))}
      </ol>
      {result?.ok ? (
        <>
          <Alert tone="success" title="Saved">
            {result.result.correct} of {result.result.total} right first time.{" "}
            {result.result.correct < result.result.total
              ? "Reread the part of the text each missed question was about."
              : "Well read."}
          </Alert>
          <div className="flex flex-wrap gap-3">
            {next ? (
              <Link href={`/app/reading/${next.slug}`} className={buttonClasses()}>
                Next: {next.title} <ArrowRight aria-hidden />
              </Link>
            ) : null}
            <Link href="/app/reading" className={buttonClasses({ variant: "secondary" })}>
              All texts
            </Link>
          </div>
        </>
      ) : questions.length > 0 ? (
        <div className="space-y-2">
          {result && !result.ok ? (
            <p role="alert" className="text-danger text-sm">
              {result.error}
            </p>
          ) : null}
          <Button
            disabled={!allAnswered || pending || !hydrated}
            onClick={() => startTransition(async () => setResult(await completeReadingAction(textSlug)))}
          >
            {pending
              ? "Saving…"
              : allAnswered
                ? "Finish and save"
                : `Answer all questions to finish (${answered} of ${questions.length})`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
