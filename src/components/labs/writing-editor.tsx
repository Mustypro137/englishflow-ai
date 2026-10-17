"use client";

import { useId, useState, useTransition } from "react";
import { createDraftAction } from "@/app/app/writing/actions";
import { useHydrated } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

const MAX = 3000;
const count = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Write or rewrite a piece: live word count, saved as a draft on the server. */
export function WritingEditor({
  kind,
  taskSlug = null,
  parentId = null,
  initialText = "",
  minWords,
  maxWords,
  withTitle = false,
  label = "Your writing",
  submitLabel = "Save",
  rows = 10,
}: {
  kind: "task" | "journal" | "sentence";
  taskSlug?: string | null;
  parentId?: string | null;
  initialText?: string;
  minWords?: number;
  maxWords?: number;
  withTitle?: boolean;
  label?: string;
  submitLabel?: string;
  rows?: number;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [text, setText] = useState(initialText);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const words = count(text);
  const unchanged = parentId !== null && text.trim() === initialText.trim();
  const lengthNote =
    minWords && words > 0 && words < minWords
      ? `Aim for at least ${minWords} words.`
      : maxWords && words > maxWords
        ? `That's more than the ${maxWords} words this task asks for.`
        : null;

  return (
    <form
      method="post"
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) {
          setError("Write something first.");
          return;
        }
        setError(undefined);
        startTransition(async () => {
          const res = await createDraftAction({ kind, taskSlug, title: withTitle ? title : null, text, parentId });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      {withTitle ? (
        <div>
          <Label htmlFor={`${ids}-title`}>Title (optional)</Label>
          <Input
            id={`${ids}-title`}
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}
      <div>
        <Label htmlFor={`${ids}-text`}>{label}</Label>
        <Textarea
          id={`${ids}-text`}
          rows={rows}
          maxLength={MAX}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          aria-describedby={`${ids}-count`}
          spellCheck={false}
        />
        <p
          id={`${ids}-count`}
          className={cn("mt-1 text-sm", lengthNote ? "text-warning" : "text-muted")}
          aria-live="polite"
        >
          {words} {words === 1 ? "word" : "words"}
          {minWords && maxWords ? ` (task: ${minWords}–${maxWords})` : ""}
          {lengthNote ? ` · ${lengthNote}` : ""}
        </p>
        <p className="text-muted mt-1 text-xs">Spell-check is off here so that you find mistakes yourself.</p>
      </div>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!hydrated || pending || unchanged}>
        {pending ? "Saving…" : unchanged ? "Change something to save a rewrite" : submitLabel}
      </Button>
    </form>
  );
}
