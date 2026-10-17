"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton, useHydrated } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-controls";
import type { MemoryView } from "@/server/db/memory";
import { addMemoryAction, confirmMemoryAction, deleteMemoryAction, updateMemoryAction } from "./actions";

export const MEMORY_KIND_LABELS = {
  preference: "How I like to learn",
  recurring_error: "A mistake I often make",
  goal: "A goal",
} as const;

export function MemoryForm({ memory, onDone }: { memory?: MemoryView; onDone?: () => void }) {
  const { state, errors, pending, onSubmit } = useFormAction(memory ? updateMemoryAction : addMemoryAction);
  useEffect(() => {
    if (state.status === "success" && onDone) onDone();
  }, [state, onDone]);
  const suffix = memory?.id ?? "new";
  return (
    <form key={state.savedAt ?? 0} method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      {memory ? <input type="hidden" name="id" value={memory.id} /> : null}
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <div className="space-y-1.5">
        <Label htmlFor={`kind-${suffix}`}>Kind of note</Label>
        <select
          id={`kind-${suffix}`}
          name="kind"
          defaultValue={memory?.kind ?? "preference"}
          className="border-border-strong bg-surface text-ink focus-visible:outline-primary block h-11 w-full rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:max-w-xs"
        >
          {Object.entries(MEMORY_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.kind ? <p className="text-danger text-sm">{errors.kind}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`content-${suffix}`}>Note</Label>
        <Textarea
          id={`content-${suffix}`}
          name="content"
          rows={2}
          maxLength={300}
          defaultValue={memory?.content}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? `content-${suffix}-error` : undefined}
        />
        {errors.content ? (
          <p id={`content-${suffix}-error`} className="text-danger text-sm">
            {errors.content}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {memory ? "Save changes" : "Add note"}
        </SubmitButton>
        {onDone ? (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function MemoryItem({ memory }: { memory: MemoryView }) {
  const [editing, setEditing] = useState(false);
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  if (editing) return <MemoryForm memory={memory} onDone={() => setEditing(false)} />;

  function run(action: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    fd.set("id", memory.id);
    startTransition(() => action(fd));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{MEMORY_KIND_LABELS[memory.kind]}</Badge>
        {memory.verified ? (
          <Badge tone="success">Confirmed</Badge>
        ) : (
          <Badge tone="warning">Suggested by the AI — not used until you confirm</Badge>
        )}
      </div>
      <p className="text-ink">{memory.content}</p>
      <div className="flex flex-wrap gap-2">
        {!memory.verified ? (
          <Button size="sm" onClick={() => run(confirmMemoryAction)} disabled={!hydrated || pending}>
            <Check aria-hidden /> Confirm
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)} disabled={!hydrated || pending}>
          <Pencil aria-hidden /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => run(deleteMemoryAction)} disabled={!hydrated || pending}>
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
    </div>
  );
}
