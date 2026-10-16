import { Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/session";
import { getDueQueue, getReviewOverview, listUpcoming } from "@/server/db/reviews";
import { ReviewSession } from "./review-session";

export const metadata: Metadata = { title: "Review" };

const KIND_LABEL = { exercise: "Exercise", vocabulary: "Word", flashcard: "Flashcard" } as const;

export default async function ReviewPage() {
  const user = await requireUser();
  const [overview, cards, upcoming] = await Promise.all([
    getReviewOverview(user.id),
    getDueQueue(user.id),
    listUpcoming(user.id),
  ]);

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Review</h1>
        <p className="text-muted mt-2">
          Answer from memory first, then check. Items come back just before you are likely to forget them.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Due now" value={overview.dueNow} />
        <Stat label="Later today" value={overview.laterToday} />
        <Stat label="Tomorrow" value={overview.tomorrow} />
      </dl>

      {overview.total === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nothing to review yet"
          actions={
            <>
              <Link href="/app/learn" className={buttonClasses()}>
                Start a lesson
              </Link>
              <Link href="/app/vocabulary" className={buttonClasses({ variant: "secondary" })}>
                Save some words
              </Link>
            </>
          }
        >
          <p>
            Exercises you answer in lessons come back here the next day. Words you save and flashcards you make appear
            here straight away.
          </p>
        </EmptyState>
      ) : cards.length > 0 ? (
        <ReviewSession cards={cards} />
      ) : (
        <div className="border-border bg-surface rounded-lg border p-5">
          <p className="text-ink font-medium">You&apos;re up to date.</p>
          <p className="text-muted mt-1 text-sm">
            {overview.nextDue ? `Your next review is ${overview.nextDue.label}.` : "No reviews are scheduled."}
          </p>
        </div>
      )}

      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-ink text-lg font-semibold">
            Your review schedule
          </h2>
          <ul className="divide-border border-border bg-surface mt-3 divide-y rounded-lg border">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="text-muted mr-2 text-xs">{KIND_LABEL[item.kind]}</span>
                  <span className="text-ink">{item.label}</span>
                </span>
                <span className="text-muted shrink-0">{item.dueLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-3 text-center">
      <dt className="text-muted text-xs sm:text-sm">{label}</dt>
      <dd className="text-ink mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}
