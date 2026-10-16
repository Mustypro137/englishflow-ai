import { CheckCircle2, CircleCheckBig } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/db/learner-profile";
import { listMistakes, type MistakeView, recurringMistakeConcepts } from "@/server/db/mistakes";
import { DeleteMistakeButton } from "./delete-mistake-button";

export const metadata: Metadata = { title: "Mistakes" };

export default async function MistakesPage() {
  const user = await requireUser();
  const [mistakes, recurring, profile] = await Promise.all([
    listMistakes(user.id),
    recurringMistakeConcepts(user.id),
    getProfile(user.id),
  ]);
  const tz = profile?.timezone ?? "UTC";
  const open = mistakes.filter((m) => !m.resolvedAt);
  const resolved = mistakes.filter((m) => m.resolvedAt);

  return (
    <Container width="narrow" className="space-y-10 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Mistakes</h1>
        <p className="text-muted mt-2">
          Mistakes are how you learn. Each one comes back in your reviews, and is marked as fixed once you get it right
          later.
        </p>
      </div>

      {mistakes.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title="No mistakes recorded yet"
          actions={
            <Link href="/app/learn" className={buttonClasses()}>
              Go to the curriculum
            </Link>
          }
        >
          <p>When you get an exercise wrong, it appears here with the correct answer and an explanation.</p>
        </EmptyState>
      ) : (
        <>
          {recurring.length > 0 ? (
            <section aria-labelledby="recurring-heading" className="border-border bg-surface rounded-lg border p-5">
              <h2 id="recurring-heading" className="text-ink font-semibold">
                Topics to practise
              </h2>
              <p className="text-muted mt-1 text-sm">Where most of your unfixed mistakes are.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recurring.map((r) => (
                  <li key={r.conceptId}>
                    <Badge tone="warning">
                      {r.name} · {r.openMistakes}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <MistakeList title={`To fix (${open.length})`} id="open" mistakes={open} tz={tz} />
          <MistakeList title={`Fixed (${resolved.length})`} id="resolved" mistakes={resolved} tz={tz} />
        </>
      )}
    </Container>
  );
}

function MistakeList({ title, id, mistakes, tz }: { title: string; id: string; mistakes: MistakeView[]; tz: string }) {
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short" });
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-ink text-xl font-semibold">
        {title}
      </h2>
      {mistakes.length === 0 ? (
        <p className="text-muted text-sm">{id === "open" ? "Nothing to fix right now." : "None yet."}</p>
      ) : (
        <ul className="space-y-3">
          {mistakes.map((m) => (
            <li key={m.id} className="border-border bg-surface rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-muted text-xs">
                  {date.format(m.createdAt)} · {m.context === "review" ? "Review" : "Lesson"}
                  {m.conceptName ? ` · ${m.conceptName}` : ""}
                </p>
                {m.resolvedAt ? (
                  <Badge tone="success">
                    <CheckCircle2 aria-hidden className="mr-1 size-3" /> Fixed
                  </Badge>
                ) : null}
              </div>
              <p className="text-ink mt-1 text-sm font-medium">{m.instructions}</p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted">Your answer</dt>
                <dd className="text-danger">{m.originalAnswer}</dd>
                <dt className="text-muted">Correct answer</dt>
                <dd className="text-success font-medium">{m.correctAnswer}</dd>
                <dt className="text-muted">Why</dt>
                <dd className="text-ink">{m.feedback ?? m.explanation}</dd>
                {m.laterAttempts > 0 ? (
                  <>
                    <dt className="text-muted">Since then</dt>
                    <dd className="text-ink">
                      {m.laterCorrect} of {m.laterAttempts} later {m.laterAttempts === 1 ? "answer" : "answers"} correct
                    </dd>
                  </>
                ) : null}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.lesson ? (
                  <Link
                    href={`/app/learn/${m.lesson.slug}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    Practise this lesson
                  </Link>
                ) : null}
                <DeleteMistakeButton id={m.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
