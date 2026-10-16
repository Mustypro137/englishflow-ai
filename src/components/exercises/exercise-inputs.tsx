"use client";

import { X } from "lucide-react";
import { Fragment } from "react";
import { Input, Label } from "@/components/ui/form-controls";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { cn } from "@/lib/utils/cn";

/** The learner's in-progress answer, one shape per kind of input. */
export type Answer =
  | { kind: "choice"; optionId: string | null }
  | { kind: "gaps"; values: string[] }
  | { kind: "text"; value: string }
  | { kind: "order"; chosen: number[] }
  | { kind: "match"; values: string[] };

export function initialAnswer(ex: ClientExercise): Answer {
  switch (ex.type) {
    case "multiple_choice":
      return { kind: "choice", optionId: null };
    case "gap_fill":
      return { kind: "gaps", values: ex.segments.slice(1).map(() => "") };
    case "word_order":
      return { kind: "order", chosen: [] };
    case "matching":
      return { kind: "match", values: ex.left.map(() => "") };
    case "error_correction":
      // Start from the sentence, so the learner edits only what is wrong.
      return { kind: "text", value: ex.sentence };
    default:
      return { kind: "text", value: "" };
  }
}

export function isComplete(ex: ClientExercise, a: Answer): boolean {
  switch (a.kind) {
    case "choice":
      return a.optionId !== null;
    case "gaps":
      return a.values.every((v) => v.trim() !== "");
    case "text":
      return a.value.trim() !== "";
    case "order":
      return ex.type === "word_order" && a.chosen.length === ex.tokens.length;
    case "match":
      return a.values.every((v) => v !== "");
  }
}

/** Convert the in-progress answer into the response shape the server grades. */
export function toResponse(ex: ClientExercise, a: Answer): unknown {
  switch (a.kind) {
    case "choice":
      return { optionId: a.optionId };
    case "gaps":
      return { answers: a.values };
    case "text":
      return { answer: a.value };
    case "order":
      return { tokens: ex.type === "word_order" ? a.chosen.map((i) => ex.tokens[i]) : [] };
    case "match":
      return { matches: a.values };
  }
}

interface InputProps {
  exercise: ClientExercise;
  answer: Answer;
  onChange: (a: Answer) => void;
  disabled: boolean;
  idPrefix: string;
  /** Per-part correctness after checking (gaps, matches). */
  parts?: boolean[];
}

export function ExerciseInput(props: InputProps) {
  const { exercise } = props;
  switch (exercise.type) {
    case "multiple_choice":
      return <ChoiceInput {...props} exercise={exercise} />;
    case "gap_fill":
      return <GapInput {...props} exercise={exercise} />;
    case "word_order":
      return <OrderInput {...props} exercise={exercise} />;
    case "matching":
      return <MatchInput {...props} exercise={exercise} />;
    default:
      return <TextAnswerInput {...props} exercise={exercise} />;
  }
}

type Of<T extends ClientExercise["type"]> = Extract<ClientExercise, { type: T }>;

function ChoiceInput({
  exercise,
  answer,
  onChange,
  disabled,
  idPrefix,
}: InputProps & { exercise: Of<"multiple_choice"> }) {
  const selected = answer.kind === "choice" ? answer.optionId : null;
  return (
    <fieldset>
      {exercise.passage ? (
        <div className="border-border bg-sunken mb-4 rounded-md border p-4">
          <p className="text-ink text-sm font-semibold">{exercise.passage.title}</p>
          <p className="prose-reading text-ink mt-2">{exercise.passage.text}</p>
        </div>
      ) : null}
      <legend className="text-ink mb-3 font-serif text-xl leading-relaxed">{exercise.prompt}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {exercise.options.map((opt) => (
          <label
            key={opt.id}
            className={cn(
              "border-border bg-surface flex cursor-pointer items-center gap-3 rounded-md border p-3",
              "has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
              "has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
              disabled && "cursor-default opacity-90",
            )}
          >
            <input
              type="radio"
              name={`${idPrefix}-choice`}
              value={opt.id}
              checked={selected === opt.id}
              disabled={disabled}
              onChange={() => onChange({ kind: "choice", optionId: opt.id })}
              className="accent-primary size-4 shrink-0 focus-visible:outline-none"
            />
            <span className="text-ink">{opt.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function GapInput({
  exercise,
  answer,
  onChange,
  disabled,
  idPrefix,
  parts,
}: InputProps & { exercise: Of<"gap_fill"> }) {
  const values = answer.kind === "gaps" ? answer.values : [];
  const total = exercise.segments.length - 1;
  return (
    <p className="text-ink font-serif text-xl leading-[2.4]">
      {exercise.segments.map((seg, i) => (
        <Fragment key={i}>
          {seg}
          {i < total ? (
            <input
              id={`${idPrefix}-gap-${i}`}
              aria-label={total > 1 ? `Gap ${i + 1} of ${total}` : "Your answer"}
              value={values[i] ?? ""}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange({ kind: "gaps", values: next });
              }}
              className={cn(
                "border-ink/40 bg-surface mx-1 inline-block w-36 max-w-full rounded-sm border-b-2 px-2 py-0.5 text-center font-sans text-lg",
                parts?.[i] === true && "border-success",
                parts?.[i] === false && "border-danger",
              )}
            />
          ) : null}
        </Fragment>
      ))}
    </p>
  );
}

function TextAnswerInput({
  exercise,
  answer,
  onChange,
  disabled,
  idPrefix,
}: InputProps & { exercise: Of<"short_answer" | "sentence_completion" | "error_correction" | "transformation"> }) {
  const value = answer.kind === "text" ? answer.value : "";
  const id = `${idPrefix}-text`;
  let label = "Your answer";
  let prompt: React.ReactNode = null;
  switch (exercise.type) {
    case "short_answer":
      prompt = <p className="text-ink font-serif text-xl">{exercise.prompt}</p>;
      break;
    case "sentence_completion":
      label = "Complete the sentence";
      prompt = <p className="text-ink font-serif text-xl">{exercise.stem} …</p>;
      break;
    case "error_correction":
      label = "Corrected sentence";
      prompt = (
        <p className="text-ink font-serif text-xl">
          <span className="sr-only">Sentence with a mistake: </span>
          {exercise.sentence}
        </p>
      );
      break;
    case "transformation":
      label = "Your sentence";
      prompt = (
        <div>
          <p className="text-ink font-serif text-xl">{exercise.source}</p>
          <p className="text-muted mt-1 text-sm font-medium">{exercise.instruction}</p>
        </div>
      );
      break;
  }
  return (
    <div className="space-y-3">
      {prompt}
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange({ kind: "text", value: e.target.value })}
        />
      </div>
    </div>
  );
}

function OrderInput({ exercise, answer, onChange, disabled, idPrefix }: InputProps & { exercise: Of<"word_order"> }) {
  const chosen = answer.kind === "order" ? answer.chosen : [];
  const remaining = exercise.tokens.map((t, i) => ({ t, i })).filter(({ i }) => !chosen.includes(i));
  const sentence = chosen.map((i) => exercise.tokens[i]).join(" ");
  return (
    <div className="space-y-4">
      <div>
        <p id={`${idPrefix}-built-label`} className="text-ink text-sm font-medium">
          Your sentence
        </p>
        <div
          aria-labelledby={`${idPrefix}-built-label`}
          className="border-border-strong bg-surface mt-1.5 flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed p-2"
        >
          {chosen.length === 0 ? <span className="text-muted px-1 text-sm">Choose words below, in order.</span> : null}
          {chosen.map((tokenIndex, pos) => (
            <button
              key={`${tokenIndex}-${pos}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ kind: "order", chosen: chosen.filter((_, p) => p !== pos) })}
              aria-label={`Remove “${exercise.tokens[tokenIndex]}”`}
              className="bg-primary-soft text-primary-hover hover:bg-primary-soft/70 inline-flex items-center gap-1 rounded-md px-3 py-2 font-medium disabled:opacity-90"
            >
              {exercise.tokens[tokenIndex]}
              {!disabled ? <X aria-hidden className="size-3.5" /> : null}
            </button>
          ))}
          {chosen.length > 0 ? <span className="text-ink text-lg">{exercise.punctuation}</span> : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {sentence ? `Your sentence so far: ${sentence}` : ""}
        </p>
      </div>
      <div>
        <p className="text-ink text-sm font-medium">Words</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {remaining.map(({ t, i }) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ kind: "order", chosen: [...chosen, i] })}
              className="border-border-strong bg-surface text-ink hover:bg-sunken rounded-md border px-3 py-2 font-medium"
            >
              {t}
            </button>
          ))}
          {remaining.length === 0 && !disabled ? <span className="text-muted text-sm">All words used.</span> : null}
        </div>
      </div>
    </div>
  );
}

function MatchInput({
  exercise,
  answer,
  onChange,
  disabled,
  idPrefix,
  parts,
}: InputProps & { exercise: Of<"matching"> }) {
  const values = answer.kind === "match" ? answer.values : [];
  return (
    <ul className="space-y-2">
      {exercise.left.map((left, i) => {
        const id = `${idPrefix}-match-${i}`;
        return (
          <li key={left} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
            <label htmlFor={id} className="text-ink font-serif text-lg">
              {left}
            </label>
            <select
              id={id}
              value={values[i] ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange({ kind: "match", values: next });
              }}
              className={cn(
                "border-border-strong bg-surface text-ink h-11 w-full rounded-md border px-3",
                parts?.[i] === true && "border-success",
                parts?.[i] === false && "border-danger",
              )}
            >
              <option value="">Choose…</option>
              {exercise.right.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </li>
        );
      })}
    </ul>
  );
}
