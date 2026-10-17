"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useHydrated } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FeedbackChange, StoredFeedback } from "@/server/ai/writing-feedback";
import { deleteDraftAction, requestFeedbackAction } from "../actions";

const CATEGORY_LABEL = {
  grammar: "Grammar",
  spelling: "Spelling",
  punctuation: "Punctuation",
  word_choice: "Word choice",
  word_order: "Word order",
} as const;

function ChangeList({
  items,
  empty,
  arrow,
}: {
  items: (FeedbackChange & { category?: keyof typeof CATEGORY_LABEL })[];
  empty: string;
  arrow: string;
}) {
  if (items.length === 0) return <p className="text-muted text-sm">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((c, i) => (
        <li key={i} className="border-border rounded-md border p-3">
          <p className="text-ink">
            <span className="sr-only">You wrote: </span>
            <del className="text-danger">{c.original}</del> <span aria-hidden>{arrow}</span>
            <span className="sr-only">{arrow === "→" ? " Better: " : " Try: "}</span>{" "}
            <ins className="bg-success-soft rounded-sm px-1 no-underline">{c.suggestion}</ins>
            {c.category ? (
              <Badge className="ml-2" tone="neutral">
                {CATEGORY_LABEL[c.category]}
              </Badge>
            ) : null}
          </p>
          <p className="text-muted mt-1 text-sm">{c.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

/** The three feedback layers, or a button to ask for them. */
export function FeedbackPanel({
  draftId,
  initial,
  configured,
}: {
  draftId: string;
  initial: StoredFeedback | null;
  configured: boolean;
}) {
  const hydrated = useHydrated();
  const [feedback, setFeedback] = useState(initial);
  const [style, setStyle] = useState(false);
  const [error, setError] = useState<string>();
  const [showCorrected, setShowCorrected] = useState(false);
  const [pending, startTransition] = useTransition();

  function ask(withStyle: boolean) {
    setError(undefined);
    startTransition(async () => {
      const res = await requestFeedbackAction(draftId, withStyle);
      if (res.ok) setFeedback(res.feedback);
      else setError(res.error);
    });
  }

  if (!feedback) {
    return (
      <div className="border-border bg-surface space-y-3 rounded-lg border p-5">
        <p className="text-ink text-sm">
          Get feedback on correctness and naturalness. It usually takes a few seconds. AI feedback can be wrong, so
          check anything that surprises you.
        </p>
        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={style}
            onChange={(e) => setStyle(e.target.checked)}
            className="accent-primary size-4"
          />
          Also suggest style improvements (optional)
        </label>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
        <Button onClick={() => ask(style)} disabled={!hydrated || pending || !configured}>
          <Sparkles aria-hidden /> {pending ? "Getting feedback…" : "Get feedback"}
        </Button>
        <p role="status" className="sr-only">
          {pending ? "Getting feedback" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface space-y-6 rounded-lg border p-5" data-testid="writing-feedback">
      <div className="space-y-1">
        <p className="text-ink">{feedback.summary}</p>
        <p className="text-muted text-sm">{feedback.meaningCheck}</p>
        <p className="text-muted text-xs">AI feedback — it can be wrong. Check anything that surprises you.</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-ink font-semibold">1. Correctness</h3>
        <ChangeList items={feedback.correctness} empty="No definite errors found." arrow="→" />
        {feedback.correctedText ? (
          <div>
            <Button size="sm" variant="ghost" aria-expanded={showCorrected} onClick={() => setShowCorrected((s) => !s)}>
              {showCorrected ? "Hide the corrected version" : "Show the corrected version"}
            </Button>
            {showCorrected ? (
              <p className="bg-sunken text-ink mt-2 rounded-md p-3 whitespace-pre-wrap">{feedback.correctedText}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-ink font-semibold">2. Naturalness</h3>
        <ChangeList items={feedback.naturalness} empty="Nothing sounds unnatural here." arrow="→" />
      </div>

      <div className="space-y-2">
        <h3 className="text-ink font-semibold">3. Style (optional)</h3>
        {feedback.style ? (
          <ChangeList items={feedback.style} empty="No style suggestions." arrow="or" />
        ) : (
          <>
            <p className="text-muted text-sm">You didn&apos;t ask for style suggestions.</p>
            {configured ? (
              <Button size="sm" variant="secondary" onClick={() => ask(true)} disabled={!hydrated || pending}>
                {pending ? "Getting suggestions…" : "Add style suggestions"}
              </Button>
            ) : null}
          </>
        )}
      </div>

      <p className="bg-primary-soft text-ink rounded-md p-3 text-sm">
        <span className="font-semibold">Next step: </span>
        {feedback.nextStep}
      </p>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A self-check list and model answer: useful with or without AI feedback. */
export function SelfCheck({
  checklist,
  modelAnswer,
  modelLabel = "A model answer",
}: {
  checklist: string[];
  modelAnswer: string;
  modelLabel?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="border-border bg-surface space-y-4 rounded-lg border p-5">
      <fieldset>
        <legend className="text-ink font-semibold">Check your own writing</legend>
        <ul className="mt-2 space-y-2">
          {checklist.map((item) => (
            <li key={item}>
              <label className="text-ink flex items-start gap-2 text-sm">
                <input type="checkbox" className="accent-primary mt-0.5 size-4 shrink-0" />
                {item}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div>
        <Button size="sm" variant="secondary" aria-expanded={shown} onClick={() => setShown((s) => !s)}>
          {shown ? `Hide ${modelLabel.toLowerCase()}` : `Show ${modelLabel.toLowerCase()}`}
        </Button>
        {shown ? (
          <div className="mt-3 space-y-1">
            <p className="text-muted text-xs">
              One possible answer, not the only right one. Compare ideas and language — then improve your own.
            </p>
            <p className="bg-sunken text-ink rounded-md p-3 whitespace-pre-wrap">{modelAnswer}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DeleteDraftButton({ draftId }: { draftId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!confirming)
    return (
      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden /> Delete this version
      </Button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm delete">
      <span className="text-ink text-sm">Delete this version? This can&apos;t be undone.</span>
      <Button
        size="sm"
        variant="primary"
        disabled={pending}
        onClick={() => startTransition(() => deleteDraftAction(draftId))}
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
