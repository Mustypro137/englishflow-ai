"use client";

import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChoiceGroup } from "@/components/forms/choice-group";
import { FormMessage } from "@/components/forms/field";
import { useHydrated } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import type { PlacementEstimate, SectionEstimate } from "@/lib/learning/placement";
import type { PlacementQuestion } from "@/server/db/curriculum";
import { chooseLevelAction, submitPlacementAction } from "./actions";

const SECTION_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading" } as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];

type Stage = "intro" | "questions" | "results";

export function PlacementFlow({
  questions,
  previous,
}: {
  questions: PlacementQuestion[];
  previous: { level: string | null; date: string } | null;
}) {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ exerciseId: string; optionId: string | null }[]>([]);
  const [result, setResult] = useState<{ resultId: string; estimate: PlacementEstimate } | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage !== "intro") headingRef.current?.focus();
  }, [stage, index]);

  const question = questions[index];

  function finish(all: typeof answers) {
    setError(undefined);
    startTransition(async () => {
      const res = await submitPlacementAction(all);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res);
      setStage("results");
    });
  }

  function advance(optionId: string | null) {
    const all = [...answers, { exerciseId: question.exercise.id, optionId }];
    setAnswers(all);
    setSelected(null);
    if (index + 1 >= questions.length) finish(all);
    else setIndex(index + 1);
  }

  function skipSection() {
    const section = question.section;
    let next = index;
    while (next < questions.length && questions[next].section === section) next++;
    setSelected(null);
    if (next >= questions.length) {
      if (answers.length === 0) {
        setError("Answer at least one section to get an estimate.");
        return;
      }
      finish(answers);
    } else setIndex(next);
  }

  if (stage === "intro") {
    return (
      <div className="space-y-6">
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Placement check</h1>
        <p className="text-ink">
          About 10 minutes. {questions.length} questions in three parts: grammar, vocabulary and reading. The questions
          get harder as you go.
        </p>
        <ul className="text-ink list-disc space-y-1 pl-6">
          <li>Answer on your own, without a dictionary — that makes the estimate useful.</li>
          <li>If you don&apos;t know an answer, choose &ldquo;I don&apos;t know&rdquo; rather than guessing.</li>
          <li>You can skip a whole part. You won&apos;t see right or wrong answers until the end.</li>
        </ul>
        <Alert tone="info" title="This gives an estimate, not a certificate">
          A short check can&apos;t measure your exact level. Listening and speaking aren&apos;t included yet. You can
          change your starting level afterwards or take the check again at any time.
        </Alert>
        {previous ? (
          <p className="text-muted text-sm">
            Your last check was on {previous.date}
            {previous.level ? ` (starting level ${previous.level})` : ""}. Taking it again saves a new result.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button size="lg" disabled={!hydrated} onClick={() => setStage("questions")}>
            Start the check <ArrowRight aria-hidden />
          </Button>
          <Link href="/app" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Not now
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "questions") {
    const ex = question.exercise;
    if (ex.type !== "multiple_choice") return null;
    const sectionQuestions = questions.filter((q) => q.section === question.section);
    const posInSection = sectionQuestions.indexOf(question) + 1;
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="primary">{SECTION_LABEL[question.section]}</Badge>
            <span className="text-muted text-sm">
              Question {index + 1} of {questions.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Placement progress"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={index}
            className="bg-sunken h-1.5 overflow-hidden rounded-full"
          >
            <div className="bg-primary h-full" style={{ width: `${(index / questions.length) * 100}%` }} />
          </div>
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="text-ink text-lg font-semibold focus:outline-none">
          {SECTION_LABEL[question.section]} — question {posInSection} of {sectionQuestions.length}
        </h1>

        {ex.passage ? (
          <div className="border-border bg-surface rounded-md border p-4">
            <p className="text-ink text-sm font-semibold">{ex.passage.title}</p>
            <p className="prose-reading text-ink mt-2">{ex.passage.text}</p>
          </div>
        ) : null}

        <form
          method="post"
          key={ex.id}
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) advance(selected);
          }}
          onChange={(e) => {
            const t = e.target as unknown as HTMLInputElement;
            if (t.name === "placement-option") setSelected(t.value);
          }}
          className="space-y-5"
        >
          <ChoiceGroup
            legend={ex.prompt}
            name="placement-option"
            type="radio"
            options={ex.options.map((o) => ({ value: o.id, label: o.text }))}
            columns={1}
          />
          <FormMessage>{error}</FormMessage>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!selected || pending}>
              {pending ? "Saving…" : index + 1 === questions.length ? "Finish" : "Next"}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => advance(null)}>
              I don&apos;t know
            </Button>
            <Button variant="ghost" disabled={pending} onClick={skipSection} className="text-muted ml-auto">
              Skip this part
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (!result) return null;
  return <Results ref={headingRef} resultId={result.resultId} estimate={result.estimate} />;
}

function describe(s: SectionEstimate): string {
  if (!s.enoughEvidence) return "Not assessed";
  if (!s.level) return "Start at A1";
  if (s.atCeiling) return `${s.level} or above`;
  return s.level;
}

function Results({
  ref,
  resultId,
  estimate,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  resultId: string;
  estimate: PlacementEstimate;
}) {
  const suggested: Level = estimate.overall ?? "A1";
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <h1 ref={ref} tabIndex={-1} className="text-ink text-2xl font-semibold tracking-tight focus:outline-none">
        Your estimated starting level
      </h1>
      <div className="border-border bg-surface rounded-lg border p-5">
        {estimate.enoughEvidence ? (
          <>
            <p className="text-ink text-4xl font-semibold">{estimate.overall ?? "A1"}</p>
            <p className="text-muted mt-1 text-sm">
              {estimate.overall
                ? "Based on the parts you answered. Treat it as a starting point."
                : "Starting at A1 will build a solid base."}
            </p>
          </>
        ) : (
          <p className="text-ink">There weren&apos;t enough answers for an estimate. You can choose a level below.</p>
        )}
        <dl className="border-border mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
          {estimate.sections.map((s) => (
            <div key={s.section}>
              <dt className="text-muted text-sm">{SECTION_LABEL[s.section]}</dt>
              <dd className="text-ink font-medium">
                {describe(s)}{" "}
                {s.enoughEvidence ? (
                  <span className="text-muted text-sm font-normal">
                    ({s.correct} of {s.answered} correct)
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-muted text-sm">Listening and speaking</dt>
            <dd className="text-ink font-medium">Not assessed yet</dd>
          </div>
        </dl>
        <p className="text-muted mt-4 flex items-start gap-2 text-xs">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          &ldquo;Or above&rdquo; means you answered everything at the highest level this check measures.
        </p>
      </div>

      <form
        method="post"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const level = new FormData(e.currentTarget).get("level") as Level | null;
          if (!level) return;
          startTransition(async () => {
            const res = await chooseLevelAction({ resultId, level });
            if (res && !res.ok) setError(res.error);
          });
        }}
      >
        <ChoiceGroup
          legend="Where would you like to start?"
          description="You can change this at any time."
          name="level"
          type="radio"
          columns={2}
          defaultValue={suggested}
          options={LEVELS.map((l) => ({ value: l, label: l === suggested ? `${l} (suggested)` : l }))}
        />
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Start at this level"}
          </Button>
          <a href="/app/placement" className={buttonClasses({ variant: "secondary" })}>
            Take the check again
          </a>
        </div>
      </form>
    </div>
  );
}
