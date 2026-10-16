"use client";

import { useId, useState } from "react";
import { FieldError, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Label, Textarea } from "@/components/ui/form-controls";
import { countSentences } from "@/lib/learning/challenges";
import { submitWritingAction } from "./actions";

const SELF_CHECK = [
  "Does every sentence have a subject and a verb?",
  "Did you use “am / is / are” with the right person?",
  "Does each sentence start with a capital letter and end with a full stop?",
  "Are the sentences your own — not copied from a lesson?",
];

/** Writing challenge: the learner writes, then checks their own sentences against a short list. */
export function WritingForm({
  challengeSlug,
  target,
  initialText,
  maxLength,
}: {
  challengeSlug: string;
  target: number;
  initialText: string;
  maxLength: number;
}) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const { state, errors, pending, onSubmit } = useFormAction(submitWritingAction);
  const counted = countSentences(text);
  const hintId = `${id}-hint`;
  const countId = `${id}-count`;
  const errorId = errors.text ? `${id}-error` : undefined;

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
      <input type="hidden" name="challengeSlug" value={challengeSlug} />
      <div className="space-y-1.5">
        <Label htmlFor={id}>Your sentences</Label>
        <p id={hintId} className="text-muted text-sm">
          Write about yourself, your family or your day. Each sentence needs at least three words.
        </p>
        <Textarea
          id={id}
          name="text"
          rows={6}
          maxLength={maxLength}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={[hintId, countId, errorId].filter(Boolean).join(" ")}
        />
        <p id={countId} className="text-muted text-sm" aria-live="polite">
          {counted} of {target} sentences
        </p>
        <FieldError id={errorId} message={errors.text} />
      </div>
      <details className="text-sm">
        <summary className="text-primary cursor-pointer font-medium">Check your own sentences</summary>
        <ul className="text-muted mt-2 list-disc space-y-1 pl-5">
          {SELF_CHECK.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <p className="text-muted mt-2">
          Automatic feedback on writing arrives with the AI tutor. For now only the number of sentences is checked.
        </p>
      </details>
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save my sentences
      </SubmitButton>
    </form>
  );
}
