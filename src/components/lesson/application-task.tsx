"use client";

import { useId, useState } from "react";
import { useHydrated } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-controls";
import type { ApplicationTask as Task } from "@content/schemas";

/**
 * Open-ended production task. The learner writes first, then compares with model
 * answers and a self-check list. Automatic feedback on free writing arrives with
 * the AI tutor (Milestone 6); nothing here is graded or saved yet.
 */
export function ApplicationTask({ task }: { task: Task }) {
  const id = useId();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-ink">{task.prompt}</p>
      <div className="space-y-1.5">
        <Label htmlFor={id}>Your sentences</Label>
        <Textarea id={id} rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        <p className="text-muted text-xs">Not saved yet — saving your writing arrives with the writing journal.</p>
      </div>
      {!shown ? (
        <Button variant="secondary" disabled={!hydrated || text.trim().length === 0} onClick={() => setShown(true)}>
          Compare with examples
        </Button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
          <div className="border-border bg-sunken rounded-md border p-4">
            <p className="text-ink text-sm font-semibold">Example answers</p>
            <ul className="text-ink mt-2 space-y-1 font-serif">
              {task.modelAnswers.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="text-muted mt-2 text-xs">Many other answers are also correct.</p>
          </div>
          <fieldset className="border-border rounded-md border p-4">
            <legend className="text-ink px-1 text-sm font-semibold">Check your own writing</legend>
            <ul className="mt-1 space-y-2">
              {task.checklist.map((item) => (
                <li key={item}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="accent-primary mt-0.5 size-4 shrink-0" />
                    <span className="text-ink">{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      )}
    </div>
  );
}
