"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormMessage, TextField } from "@/components/forms/field";
import { SubmitButton, useHydrated } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form-controls";
import type { FlashcardView, NoteView } from "@/server/db/notebook";
import { deleteFlashcardAction, deleteNoteAction, saveFlashcardAction, saveNoteAction } from "./actions";

const NOTE_KINDS = [
  { value: "grammar_note", label: "Grammar note" },
  { value: "saved_sentence", label: "Useful sentence" },
] as const;

// --- Flashcards ---------------------------------------------------------------

export function FlashcardForm({ card, onDone }: { card?: FlashcardView; onDone?: () => void }) {
  const { state, errors, pending, onSubmit } = useFormAction(saveFlashcardAction);
  // Editing: close the form after a successful save. Creating: the form re-mounts (key) to clear itself.
  useEffect(() => {
    if (state.status === "success" && onDone) onDone();
  }, [state, onDone]);
  const key = state.savedAt ?? 0;
  return (
    <form key={key} method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      {card ? <input type="hidden" name="id" value={card.id} /> : null}
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <div className="space-y-1.5">
        <Label htmlFor={`front-${card?.id ?? "new"}`}>Front (the question or prompt)</Label>
        <Textarea
          id={`front-${card?.id ?? "new"}`}
          name="front"
          rows={2}
          defaultValue={card?.front}
          aria-invalid={errors.front ? true : undefined}
        />
        {errors.front ? <p className="text-danger text-sm">{errors.front}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`back-${card?.id ?? "new"}`}>Back (the answer)</Label>
        <Textarea
          id={`back-${card?.id ?? "new"}`}
          name="back"
          rows={2}
          defaultValue={card?.back}
          aria-invalid={errors.back ? true : undefined}
        />
        {errors.back ? <p className="text-danger text-sm">{errors.back}</p> : null}
      </div>
      <TextField label="Note (optional)" name="note" defaultValue={card?.note ?? ""} error={errors.note} />
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {card ? "Save changes" : "Add card"}
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

export function FlashcardItem({ card }: { card: FlashcardView }) {
  const [editing, setEditing] = useState(false);
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  if (editing) return <FlashcardForm card={card} onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-ink font-medium whitespace-pre-line">{card.front}</p>
        <p className="text-muted text-sm whitespace-pre-line">{card.back}</p>
        {card.note ? <p className="text-muted text-xs">{card.note}</p> : null}
        <p className="text-muted mt-1 text-xs">Next review: {card.dueLabel ?? "—"}</p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hydrated}
          onClick={() => setEditing(true)}
          aria-label={`Edit card “${card.front}”`}
        >
          <Pencil aria-hidden /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger"
          disabled={!hydrated || pending}
          aria-label={`Delete card “${card.front}”`}
          onClick={() => {
            if (confirm("Delete this card and its review schedule?"))
              startTransition(() => deleteFlashcardAction(card.id));
          }}
        >
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
    </div>
  );
}

// --- Notes --------------------------------------------------------------------

export function NoteForm({
  note,
  lessons,
  onDone,
}: {
  note?: NoteView;
  lessons: { slug: string; title: string }[];
  onDone?: () => void;
}) {
  const { state, errors, pending, onSubmit } = useFormAction(saveNoteAction);
  // Editing: close the form after a successful save. Creating: the form re-mounts (key) to clear itself.
  useEffect(() => {
    if (state.status === "success" && onDone) onDone();
  }, [state, onDone]);
  const key = state.savedAt ?? 0;
  const id = note?.id ?? "new";
  return (
    <form key={key} method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      {note ? <input type="hidden" name="id" value={note.id} /> : null}
      <FormMessage tone={state.status === "success" ? "success" : "error"}>
        {state.status !== "idle" && !pending ? state.message : undefined}
      </FormMessage>
      <ChoiceGroup
        legend="Type"
        name="kind"
        type="radio"
        columns={2}
        options={NOTE_KINDS}
        defaultValue={note?.kind ?? "grammar_note"}
        error={errors.kind}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`body-${id}`}>Note</Label>
        <Textarea
          id={`body-${id}`}
          name="body"
          rows={3}
          defaultValue={note?.body}
          aria-invalid={errors.body ? true : undefined}
        />
        {errors.body ? <p className="text-danger text-sm">{errors.body}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`lesson-${id}`}>Related lesson (optional)</Label>
        <select
          id={`lesson-${id}`}
          name="lessonSlug"
          defaultValue={note?.lesson?.slug ?? ""}
          className="border-border-strong bg-surface text-ink h-11 w-full rounded-md border px-3"
        >
          <option value="">None</option>
          {lessons.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {note ? "Save changes" : "Save note"}
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

export function NoteItem({ note, lessons }: { note: NoteView; lessons: { slug: string; title: string }[] }) {
  const [editing, setEditing] = useState(false);
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  if (editing) return <NoteForm note={note} lessons={lessons} onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-muted text-xs">{note.kind === "grammar_note" ? "Grammar note" : "Useful sentence"}</p>
        <p className="text-ink whitespace-pre-line">{note.body}</p>
        {note.lesson ? <p className="text-muted text-xs">Lesson: {note.lesson.title}</p> : null}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={!hydrated} onClick={() => setEditing(true)} aria-label="Edit note">
          <Pencil aria-hidden /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger"
          disabled={!hydrated || pending}
          aria-label="Delete note"
          onClick={() => {
            if (confirm("Delete this note?")) startTransition(() => deleteNoteAction(note.id));
          }}
        >
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
    </div>
  );
}
