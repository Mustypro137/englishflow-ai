"use client";

import { ArrowRight, CheckCircle2, CircleAlert, Eye, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  type Answer,
  ExerciseInput,
  initialAnswer,
  isComplete,
  toResponse,
} from "@/components/exercises/exercise-inputs";
import { Feedback } from "@/components/exercises/exercise-card";
import { useHydrated } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import type { ReviewCardView } from "@/lib/learning/review-card";
import type { Rating } from "@/lib/learning/srs/scheduler";
import { cn } from "@/lib/utils/cn";
import { answerReviewAction, type ReviewActionResult } from "./actions";

type Done = Extract<ReviewActionResult, { ok: true }>;

const RATING_LABELS: { rating: Rating; label: string; hint: string; tone: string }[] = [
  { rating: "again", label: "Again", hint: "I didn't remember", tone: "border-danger/40 text-danger" },
  { rating: "hard", label: "Hard", hint: "With difficulty", tone: "border-warning/40 text-warning" },
  { rating: "good", label: "Good", hint: "I remembered", tone: "border-primary/40 text-primary-hover" },
  { rating: "easy", label: "Easy", hint: "Instantly", tone: "border-success/40 text-success" },
];

const KIND_LABEL: Record<ReviewCardView["kind"], string> = {
  exercise: "Lesson exercise",
  word_recall: "Word — recall",
  word_recognise: "Word — meaning",
  flashcard: "Flashcard",
};

/** Works through the cards due now, one at a time. */
export function ReviewSession({ cards }: { cards: ReviewCardView[] }) {
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({ reviewed: 0, remembered: 0 });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (index > 0) headingRef.current?.focus();
  }, [index]);

  if (index >= cards.length) {
    return (
      <div className="border-border bg-surface rounded-lg border p-6 text-center">
        <PartyPopper aria-hidden className="text-primary mx-auto size-8" />
        <h2 ref={headingRef} tabIndex={-1} className="text-ink mt-3 text-xl font-semibold focus:outline-none">
          Reviews done for now
        </h2>
        <p className="text-muted mt-2">
          You reviewed {stats.reviewed} {stats.reviewed === 1 ? "item" : "items"} and remembered {stats.remembered}.
          Items you found hard will come back sooner.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href="/app/review" className={buttonClasses({ variant: "secondary" })}>
            Check for more
          </a>
          <Link href="/app" className={buttonClasses()}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];
  function finish(done: Done) {
    setStats((s) => ({
      reviewed: s.reviewed + 1,
      remembered: s.remembered + (done.rating === "again" ? 0 : 1),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="text-ink text-lg font-semibold focus:outline-none">
          Card {index + 1} of {cards.length}
        </h2>
        <Badge>{KIND_LABEL[card.kind]}</Badge>
      </div>
      <div
        role="progressbar"
        aria-label="Review progress"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={index}
        className="bg-sunken h-1.5 overflow-hidden rounded-full"
      >
        <div className="bg-primary h-full" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>
      <CardView key={card.id} card={card} onDone={finish} onNext={() => setIndex((i) => i + 1)} />
    </div>
  );
}

function CardView({ card, onDone, onNext }: { card: ReviewCardView; onDone: (d: Done) => void; onNext: () => void }) {
  switch (card.kind) {
    case "exercise":
      return <ExerciseReview card={card} onDone={onDone} onNext={onNext} />;
    case "word_recall":
      return <WordRecall card={card} onDone={onDone} onNext={onNext} />;
    default:
      return <SelfRated card={card} onDone={onDone} onNext={onNext} />;
  }
}

function NextDue({ done, onNext }: { done: Done; onNext: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted text-sm">
        Next review: <span className="text-ink font-medium">{done.nextDueLabel}</span>
      </p>
      <Button onClick={onNext} autoFocus>
        Next <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}

function useAnswer(onDone: (d: Done) => void) {
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  function send(input: Parameters<typeof answerReviewAction>[0]) {
    setError(undefined);
    startTransition(async () => {
      const res = await answerReviewAction(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(res);
      onDone(res);
    });
  }
  return { done, error, pending, send };
}

function ExerciseReview({
  card,
  onDone,
  onNext,
}: {
  card: Extract<ReviewCardView, { kind: "exercise" }>;
  onDone: (d: Done) => void;
  onNext: () => void;
}) {
  const id = useId();
  const hydrated = useHydrated();
  const [answer, setAnswer] = useState<Answer>(() => initialAnswer(card.exercise));
  const [revealed, setRevealed] = useState(false);
  const { done, error, pending, send } = useAnswer(onDone);
  const [localError, setLocalError] = useState<string>();

  return (
    <article aria-labelledby={`${id}-title`} className="border-border bg-surface rounded-lg border p-5 sm:p-6">
      <p id={`${id}-title`} className="text-muted text-sm">
        From the lesson: {card.lesson?.title ?? "a lesson"} — answer from memory.
      </p>
      <p className="text-ink mt-2 text-sm font-medium">{card.exercise.instructions}</p>
      <form
        method="post"
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (done || pending) return;
          if (!isComplete(card.exercise, answer)) {
            setLocalError("Answer every part first.");
            return;
          }
          setLocalError(undefined);
          send({ reviewItemId: card.id, response: toResponse(card.exercise, answer), helped: false });
        }}
      >
        <ExerciseInput
          exercise={card.exercise}
          answer={answer}
          onChange={(a) => {
            setAnswer(a);
            setLocalError(undefined);
          }}
          disabled={Boolean(done) || pending}
          idPrefix={id}
          parts={done?.result?.parts}
        />
        {!done ? (
          <Button type="submit" disabled={!hydrated || pending}>
            {pending ? "Checking…" : "Check"}
          </Button>
        ) : null}
      </form>
      <div aria-live="polite" className="mt-4 empty:mt-0">
        {localError || error ? <p className="text-danger text-sm">{localError ?? error}</p> : null}
        {done?.result ? <Feedback result={done.result} revealed={revealed} onReveal={() => setRevealed(true)} /> : null}
      </div>
      {done ? <NextDue done={done} onNext={onNext} /> : null}
    </article>
  );
}

function WordRecall({
  card,
  onDone,
  onNext,
}: {
  card: Extract<ReviewCardView, { kind: "word_recall" }>;
  onDone: (d: Done) => void;
  onNext: () => void;
}) {
  const id = useId();
  const hydrated = useHydrated();
  const [value, setValue] = useState("");
  const { done, error, pending, send } = useAnswer(onDone);

  return (
    <article aria-labelledby={`${id}-title`} className="border-border bg-surface rounded-lg border p-5 sm:p-6">
      <h3 id={`${id}-title`} className="text-muted text-sm font-medium">
        Which word is it? <span className="text-muted">({card.word.partOfSpeech})</span>
      </h3>
      <p className="text-ink mt-2 text-lg">{card.word.definition}</p>
      <form
        method="post"
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!done && !pending && value.trim()) send({ reviewItemId: card.id, response: { answer: value } });
        }}
      >
        <p className="text-ink font-serif text-xl">
          {card.cloze[0]}
          <span className="border-ink/40 inline-block min-w-16 border-b-2 text-center">&nbsp;</span>
          {card.cloze[1]}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-input`}>The missing word</Label>
          <Input
            id={`${id}-input`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={Boolean(done) || pending}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        {!done ? (
          <Button type="submit" disabled={!hydrated || pending || !value.trim()}>
            {pending ? "Checking…" : "Check"}
          </Button>
        ) : null}
      </form>
      <div aria-live="polite" className="mt-4 empty:mt-0">
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        {done ? (
          <div className={cn("rounded-md p-4", done.correct ? "bg-success-soft" : "bg-danger-soft")}>
            <p className={cn("flex items-center gap-2 font-semibold", done.correct ? "text-success" : "text-danger")}>
              {done.correct ? (
                <CheckCircle2 aria-hidden className="size-5" />
              ) : (
                <CircleAlert aria-hidden className="size-5" />
              )}
              {done.correct ? "Correct" : "Not quite"}
            </p>
            <p className="text-ink mt-1">
              The word is <span className="font-semibold">{done.answer}</span>.
            </p>
          </div>
        ) : null}
      </div>
      {done ? <NextDue done={done} onNext={onNext} /> : null}
    </article>
  );
}

function SelfRated({
  card,
  onDone,
  onNext,
}: {
  card: Extract<ReviewCardView, { kind: "word_recognise" | "flashcard" }>;
  onDone: (d: Done) => void;
  onNext: () => void;
}) {
  const id = useId();
  const hydrated = useHydrated();
  const [shown, setShown] = useState(false);
  const { done, error, pending, send } = useAnswer(onDone);

  return (
    <article aria-labelledby={`${id}-front`} className="border-border bg-surface rounded-lg border p-5 sm:p-6">
      {card.kind === "word_recognise" ? (
        <>
          <p className="text-muted text-sm">What does this mean? Say or think the answer before you reveal it.</p>
          <h3 id={`${id}-front`} className="text-ink mt-2 font-serif text-3xl">
            {card.word.headword}
          </h3>
          <p className="text-muted text-sm">
            {card.word.partOfSpeech}
            {card.word.ipa ? ` · ${card.word.ipa}` : ""}
          </p>
        </>
      ) : (
        <>
          <p className="text-muted text-sm">Recall the answer before you reveal it.</p>
          <h3 id={`${id}-front`} className="text-ink mt-2 font-serif text-2xl whitespace-pre-line">
            {card.front}
          </h3>
        </>
      )}

      {!shown ? (
        <Button className="mt-5" variant="secondary" disabled={!hydrated} onClick={() => setShown(true)}>
          <Eye aria-hidden /> Show the answer
        </Button>
      ) : (
        <div aria-live="polite" className="mt-5 space-y-4">
          <div className="border-border bg-sunken rounded-md border p-4">
            {card.kind === "word_recognise" ? (
              <>
                <p className="text-ink">{card.word.definition}</p>
                <ul className="text-ink/90 mt-2 list-disc space-y-1 pl-5 font-serif">
                  {card.word.examples.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
                <p className="text-muted mt-2 text-sm">Often used: {card.word.collocations.join(" · ")}</p>
              </>
            ) : (
              <>
                <p className="text-ink whitespace-pre-line">{card.back}</p>
                {card.note ? <p className="text-muted mt-2 text-sm">{card.note}</p> : null}
              </>
            )}
          </div>
          {!done ? (
            <fieldset>
              <legend className="text-ink text-sm font-medium">How well did you remember?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATING_LABELS.map((r) => (
                  <button
                    key={r.rating}
                    type="button"
                    disabled={pending}
                    onClick={() => send({ reviewItemId: card.id, rating: r.rating })}
                    className={cn(
                      "bg-surface hover:bg-sunken flex flex-col items-center rounded-md border-2 px-3 py-2 disabled:opacity-60",
                      r.tone,
                    )}
                  >
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-muted text-xs">{r.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {error ? <p className="text-danger text-sm">{error}</p> : null}
        </div>
      )}
      {done ? <NextDue done={done} onNext={onNext} /> : null}
    </article>
  );
}
