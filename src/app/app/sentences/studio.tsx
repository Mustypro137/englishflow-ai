"use client";

import type { ExpansionTask, OriginalSentencePrompt } from "@content/labs/schemas";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { createDraftAction } from "@/app/app/writing/actions";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { useHydrated } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import type { ClientExercise } from "@/lib/learning/client-exercise";
import { type ExpansionCheck, checkExpansion, usesPattern } from "@/lib/learning/sentence-studio";
import { cn } from "@/lib/utils/cn";
import { saveSentenceNoteAction } from "./actions";

export function BuildSet({ exercises }: { exercises: ClientExercise[] }) {
  return (
    <ol className="space-y-6">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <ExerciseCard
            exercise={ex}
            label={`Exercise ${i + 1} of ${exercises.length}`}
            allowHints
            context="practice"
          />
        </li>
      ))}
    </ol>
  );
}

export function ExpansionStudio({ tasks }: { tasks: ExpansionTask[] }) {
  const [slug, setSlug] = useState(tasks[0]?.slug ?? "");
  const task = tasks.find((t) => t.slug === slug);
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Choose a sentence to expand" className="flex flex-wrap gap-2">
        {tasks.map((t) => (
          <Button
            key={t.slug}
            size="sm"
            variant={t.slug === slug ? "primary" : "secondary"}
            aria-pressed={t.slug === slug}
            onClick={() => setSlug(t.slug)}
          >
            {t.base}
          </Button>
        ))}
      </div>
      {task ? <ExpansionRun key={task.slug} task={task} /> : null}
    </div>
  );
}

function ExpansionRun({ task }: { task: ExpansionTask }) {
  const ids = useId();
  const hydrated = useHydrated();
  const [sentences, setSentences] = useState<string[]>([task.base]);
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState<ExpansionCheck | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const step = sentences.length - 1;
  const done = step >= task.steps.length;
  const current = sentences[sentences.length - 1];

  return (
    <div className="border-border bg-surface space-y-4 rounded-lg border p-5">
      <ol className="space-y-1">
        {sentences.map((s, i) => (
          <li key={i} className={cn("text-ink", i === sentences.length - 1 ? "font-semibold" : "text-muted")}>
            <span className="text-muted mr-2 text-xs">{i === 0 ? "Start" : `Step ${i}`}</span>
            {s}
          </li>
        ))}
      </ol>
      {!done ? (
        <form
          method="post"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const result = checkExpansion(current, draft);
            setCheck(result);
          }}
        >
          <p className="text-ink text-sm">
            <Badge tone="primary" className="mr-2">
              Step {step + 1} of {task.steps.length}
            </Badge>
            {task.steps[step].instruction}
          </p>
          <div>
            <Label htmlFor={`${ids}-input`}>Your longer sentence</Label>
            <Input
              id={`${ids}-input`}
              value={draft}
              maxLength={300}
              autoComplete="off"
              onChange={(e) => {
                setDraft(e.target.value);
                setCheck(null);
              }}
            />
          </div>
          {check ? (
            <div aria-live="polite" className="space-y-2 text-sm">
              {check.ok ? (
                <p className="text-success flex items-center gap-1.5">
                  <CheckCircle2 aria-hidden className="size-4" /> It keeps your sentence and adds {check.addedWords}{" "}
                  {check.addedWords === 1 ? "word" : "words"}.
                </p>
              ) : (
                <p className="text-danger flex items-start gap-1.5">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {check.missing.length
                    ? `Keep every word of your sentence. Missing: ${check.missing.join(", ")}.`
                    : "Add something new to the sentence."}
                </p>
              )}
              {check.ok && !check.endsWithPunctuation ? (
                <p className="text-muted">Remember the full stop or question mark at the end.</p>
              ) : null}
              {check.ok ? (
                <p className="text-muted">
                  An example: <span className="text-ink">{task.steps[step].example}</span> Yours can be different — this
                  only checks the structure, not every detail of grammar.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={!hydrated || !draft.trim()}>
              Check
            </Button>
            {check?.ok ? (
              <Button
                onClick={() => {
                  setSentences((s) => [...s, draft.trim()]);
                  setDraft("");
                  setCheck(null);
                }}
              >
                {step + 1 === task.steps.length ? "Finish" : "Next step"}
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-success flex items-center gap-1.5 text-sm">
            <CheckCircle2 aria-hidden className="size-4" /> From {task.base.split(/\s+/).length} words to{" "}
            {current.split(/\s+/).length}.
          </p>
          {saved ? (
            <p role="status" className="text-ink text-sm">
              Saved to your notebook.
            </p>
          ) : (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => startTransition(async () => setSaved(await saveSentenceNoteAction(current)))}
            >
              {pending ? "Saving…" : "Save the sentence to my notebook"}
            </Button>
          )}
          {saved === false ? (
            <p role="alert" className="text-danger text-sm">
              It couldn&apos;t be saved. Try again.
            </p>
          ) : null}
          <Button variant="ghost" onClick={() => setSentences([task.base])}>
            Start again
          </Button>
        </div>
      )}
    </div>
  );
}

export function OriginalSentences({ prompts }: { prompts: OriginalSentencePrompt[] }) {
  return (
    <ul className="space-y-4">
      {prompts.map((p) => (
        <li key={p.slug}>
          <OriginalSentence prompt={p} />
        </li>
      ))}
    </ul>
  );
}

function OriginalSentence({ prompt }: { prompt: OriginalSentencePrompt }) {
  const ids = useId();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "missing" | "ok">("idle");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <form
      method="post"
      className="border-border bg-surface space-y-3 rounded-lg border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!usesPattern(text, prompt.mustIncludeOneOf)) {
          setStatus("missing");
          return;
        }
        setStatus("ok");
        setError(undefined);
        startTransition(async () => {
          const res = await createDraftAction({
            kind: "sentence",
            taskSlug: prompt.slug,
            title: null,
            text,
            parentId: null,
          });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{prompt.level}</Badge>
        <span className="text-ink font-semibold">{prompt.pattern}</span>
      </div>
      <div>
        <Label htmlFor={`${ids}-text`}>{prompt.prompt}</Label>
        <Input
          id={`${ids}-text`}
          value={text}
          maxLength={300}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setStatus("idle");
          }}
        />
      </div>
      {status === "missing" ? (
        <p role="alert" className="text-danger text-sm">
          Use the pattern: {prompt.mustIncludeOneOf.map((f) => `“${f}”`).join(" or ")}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      {tried ? (
        <p className="text-muted text-sm">
          Examples:{" "}
          {prompt.examples.map((x, i) => (
            <span key={i} className="text-ink">{`${i ? " · " : ""}${x}`}</span>
          ))}
        </p>
      ) : null}
      <Button type="submit" disabled={!hydrated || pending || !text.trim()}>
        {pending ? "Saving…" : "Save and get feedback"}
      </Button>
    </form>
  );
}
