import { ArrowRight, Circle, CircleCheck, Compass, Flame, NotebookPen, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WeekChart } from "@/components/dashboard/week-chart";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProgressBar } from "@/components/ui/progress-bar";
import { nextLesson } from "@/lib/learning/recommend/engine";
import { greetingFor } from "@/lib/learning/time";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/db/activity";
import { getLatestPlacement } from "@/server/db/learning-records";
import { getProfile } from "@/server/db/learner-profile";
import { listMistakes } from "@/server/db/mistakes";
import { getCurrentSession, previewSession } from "@/server/db/sessions";

export const metadata: Metadata = { title: "Today" };

const card = "border-border bg-surface rounded-xl border p-5 sm:p-6";
const cardHeading = "text-ink text-lg font-semibold";

export default async function TodayPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const now = new Date();
  const [data, placement, mistakes, session] = await Promise.all([
    getDashboard(user.id, now),
    getLatestPlacement(user.id),
    listMistakes(user.id, { limit: 3, openOnly: true }),
    getCurrentSession(user.id, now),
  ]);
  const { snapshot } = data;
  const next = nextLesson(snapshot);
  const allDone = !next.lesson && snapshot.lessons.some((l) => l.status === "published");
  // Today's plan: the session in progress (or finished today), else the plan a session would start with.
  const plan = session ? session.plan : await previewSession(user.id, data.dailyMinutes, now);
  const done = new Set(session?.completedBlocks ?? []);
  const levelLabel = data.levelSource === "placement" ? "estimate from your placement check" : "your own estimate";
  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: snapshot.timezone });
  const todayFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: snapshot.timezone,
  });

  return (
    <Container className="space-y-6 py-8 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted">{todayFmt.format(now)}</p>
          <h1 className="text-ink mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {greetingFor(now, snapshot.timezone)}, {profile.displayName}
          </h1>
          <p className="text-muted mt-2 flex flex-wrap items-center gap-2">
            {snapshot.level ? (
              <>
                <span>
                  Working level: <span className="text-ink font-medium">{snapshot.level}</span>
                </span>
                <Badge>{levelLabel}</Badge>
              </>
            ) : (
              <span>No level set yet — starting from the beginning.</span>
            )}
          </p>
        </div>
        {data.gamification && data.streak > 0 ? (
          <p className="bg-accent-soft text-accent flex items-center gap-1.5 self-start rounded-full px-3.5 py-2 text-sm font-semibold sm:self-auto">
            <Flame aria-hidden className="size-4" /> {data.streak}-day streak
          </p>
        ) : null}
      </header>

      {!data.hasActivity ? (
        <section aria-labelledby="start-heading" className={`${card} bg-primary-soft border-primary/30`}>
          <h2 id="start-heading" className={cardHeading}>
            Let&apos;s get started
          </h2>
          <p className="text-ink/85 mt-2 text-sm">
            This page fills in as you study: your plan, your mistakes and your week. Nothing here is made up — it all
            comes from your own answers. Start with the first step of today&apos;s plan below.
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="continue-heading"
          className={`${card} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:col-span-3`}
        >
          <div className="min-w-0 flex-1">
            <h2 id="continue-heading" className="text-primary text-sm font-semibold">
              Continue learning
            </h2>
            {next.lesson ? (
              <>
                <p className="text-ink mt-2 font-serif text-2xl font-semibold sm:text-3xl">{next.lesson.title}</p>
                <p className="text-muted mt-1">
                  {next.lesson.levelCode} · {next.lesson.unitTitle}
                  {next.lesson.estimatedMinutes ? ` · about ${next.lesson.estimatedMinutes} min` : ""}
                </p>
                {next.lesson.answered > 0 ? (
                  <div className="mt-4 max-w-sm">
                    <ProgressBar
                      value={next.lesson.answered}
                      max={next.lesson.total}
                      label={`${next.lesson.title}: exercises answered`}
                    />
                    <p className="text-muted mt-1 text-xs">
                      {next.lesson.answered} of {next.lesson.total} exercises answered
                    </p>
                  </div>
                ) : null}
                {next.belowLevel ? (
                  <p className="bg-warning-soft text-ink mt-4 rounded-md p-3 text-sm">
                    Lessons at your level ({snapshot.level}) are planned but not written yet. Meanwhile, these lessons
                    are a quick way to check the basics.
                  </p>
                ) : null}
              </>
            ) : allDone ? (
              <p className="text-ink mt-3 flex items-start gap-2">
                <PartyPopper aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
                You&apos;ve finished every lesson available so far. New lessons are being added.
              </p>
            ) : (
              <p className="text-muted mt-3">No lessons are available yet.</p>
            )}
            {!placement ? (
              <p className="text-muted mt-4 flex flex-wrap items-center gap-x-2 text-sm">
                <Compass aria-hidden className="size-4" /> Not sure of your level?
                <Link href="/app/placement" className="text-primary font-medium underline-offset-2 hover:underline">
                  Take the 10-minute placement check
                </Link>
              </p>
            ) : null}
          </div>
          {next.lesson ? (
            <Link href={`/app/learn/${next.lesson.slug}`} className={buttonClasses({ size: "lg" })}>
              {next.lesson.answered > 0 ? "Continue lesson" : "Start lesson"} <ArrowRight aria-hidden />
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="plan-heading" className={card}>
          <h2 id="plan-heading" className={cardHeading}>
            Today&apos;s plan
          </h2>
          <p className="text-muted mt-1 text-sm">
            {session
              ? `Your ${session.plannedMinutes}-minute study session`
              : `Built around your ${plan.minutes}-minute goal`}
          </p>
          {plan.blocks.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {plan.blocks.map((b) => {
                const isDone = done.has(b.id);
                return (
                  <li key={b.id}>
                    <Link
                      href={b.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-3 text-sm",
                        isDone ? "bg-success-soft" : "bg-sunken hover:bg-primary-soft",
                      )}
                    >
                      {isDone ? (
                        <CircleCheck aria-hidden className="text-success size-5 shrink-0" />
                      ) : (
                        <Circle aria-hidden className="text-border-strong size-5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="text-ink block font-medium">{b.title}</span>
                        <span className="text-muted block">{b.description}</span>
                      </span>
                      <span className={cn("shrink-0", isDone ? "text-success font-medium" : "text-muted")}>
                        {isDone ? "Done" : `${b.minutes} min`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-muted mt-3 text-sm">Nothing to plan yet.</p>
          )}
          <Link
            href="/app/session"
            className={buttonClasses({
              variant: session && !session.completedAt ? "primary" : "secondary",
              size: "sm",
              className: "mt-4",
            })}
          >
            {session && !session.completedAt ? "Continue your session" : "Plan a study session"}
          </Link>
        </section>

        <section aria-labelledby="week-heading" className={card}>
          <h2 id="week-heading" className={cardHeading}>
            This week
          </h2>
          <p className="text-muted mt-1 text-sm">Answers and reviews per day</p>
          <WeekChart days={data.week} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Days studied</dt>
              <dd className="text-ink text-lg font-semibold">{data.daysThisWeek}</dd>
            </div>
            {data.gamification ? (
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <Flame aria-hidden className="size-4" /> Streak
                </dt>
                <dd className="text-ink text-lg font-semibold">
                  {data.streak} {data.streak === 1 ? "day" : "days"}
                </dd>
              </div>
            ) : null}
          </dl>
          {data.gamification ? (
            <p className="text-muted mt-2 text-xs">
              One missed day a week doesn&apos;t break your streak. {data.points} learning points so far — answers you
              get right on your own count double.
            </p>
          ) : null}
          <Link href="/app/calendar" className={`${buttonClasses({ variant: "ghost", size: "sm" })} mt-2`}>
            Study calendar
          </Link>
        </section>

        <section aria-labelledby="mistakes-heading" className={card}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <NotebookPen aria-hidden className="text-primary size-5" />
              <h2 id="mistakes-heading" className={cardHeading}>
                Recent mistakes
              </h2>
            </div>
            <Link href="/app/mistakes" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              All mistakes
            </Link>
          </div>
          {mistakes.length > 0 ? (
            <>
              <ul className="mt-3 space-y-3">
                {mistakes.map((m) => (
                  <li key={m.id} className="bg-danger-soft rounded-lg p-3 text-sm">
                    <p className="text-muted">
                      {m.conceptName ?? "Exercise"} · {dateFmt.format(m.createdAt)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2">
                      <span className="sr-only">You wrote</span>
                      <span className="text-danger line-through">{m.originalAnswer}</span>
                      <ArrowRight aria-hidden className="text-muted size-4" />
                      <span className="sr-only">correct:</span>
                      <span className="text-success font-semibold">{m.correctAnswer}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <Link href="/app/practice" className={buttonClasses({ variant: "link", className: "mt-3 px-0" })}>
                Practise these <ArrowRight aria-hidden />
              </Link>
            </>
          ) : (
            <p className="text-muted mt-3 text-sm">
              {data.hasActivity ? "No open mistakes — nice work." : "Mistakes you make in lessons will appear here."}
            </p>
          )}
        </section>
      </div>
    </Container>
  );
}
