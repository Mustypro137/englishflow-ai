import {
  ArrowRight,
  Award,
  CalendarCheck,
  Compass,
  Flame,
  Layers,
  ListChecks,
  NotebookPen,
  PartyPopper,
  Settings,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WeekChart } from "@/components/dashboard/week-chart";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SKILL_NAMES, STATE_LABEL } from "@/lib/learning/labels";
import { nextLesson, recommend } from "@/lib/learning/recommend/engine";
import { GOALS } from "@/lib/validation/profile";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/db/activity";
import { getLatestPlacement } from "@/server/db/learning-records";
import { getProfile } from "@/server/db/learner-profile";
import { listMistakes } from "@/server/db/mistakes";
import { getReviewOverview } from "@/server/db/reviews";
import { getCurrentSession } from "@/server/db/sessions";

export const metadata: Metadata = { title: "Today" };

const card = "border-border bg-surface rounded-xl border p-5 sm:p-6";
const cardHeading = "text-ink text-lg font-semibold";

export default async function TodayPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const now = new Date();
  const [data, reviews, placement, mistakes, session] = await Promise.all([
    getDashboard(user.id, now),
    getReviewOverview(user.id, now),
    getLatestPlacement(user.id),
    listMistakes(user.id, { limit: 3, openOnly: true }),
    getCurrentSession(user.id, now),
  ]);
  const { snapshot } = data;
  const recs = recommend(snapshot, 4);
  const next = nextLesson(snapshot);
  const allDone = !next.lesson && snapshot.lessons.some((l) => l.status === "published");
  const inProgress = snapshot.concepts.filter((c) => c.state === "learning" || c.state === "practicing");
  const goalLabels = GOALS.filter((g) => profile.goals.includes(g.value)).map((g) => g.label);
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
            Welcome, {profile.displayName}
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
        <div className="flex flex-wrap items-center gap-3">
          {data.gamification && data.streak > 0 ? (
            <p className="bg-accent-soft text-accent flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold">
              <Flame aria-hidden className="size-4" /> {data.streak}-day streak
            </p>
          ) : null}
          <Link href="/app/session" className={buttonClasses()}>
            <ListChecks aria-hidden />{" "}
            {session && !session.completedAt ? "Continue your session" : "Plan a study session"}
          </Link>
        </div>
      </header>

      {!data.hasActivity ? (
        <section aria-labelledby="start-heading" className={`${card} bg-primary-soft border-primary/30`}>
          <h2 id="start-heading" className={cardHeading}>
            Let&apos;s get started
          </h2>
          <p className="text-ink/85 mt-2 text-sm">
            This page fills in as you study: your reviews, the topics you&apos;re learning, your mistakes and your week.
            Nothing here is made up — it all comes from your own answers. Start with the first recommended step below.
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="objectives-heading"
        className={`${card} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:p-8`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Target aria-hidden className="text-primary size-4" />
            <h2 id="objectives-heading" className="text-primary text-sm font-semibold">
              Current objectives
            </h2>
          </div>
          {next.lesson ? (
            <>
              <p className="text-ink mt-3 font-serif text-2xl font-semibold sm:text-3xl">{next.lesson.title}</p>
              <p className="text-muted mt-1 text-sm">
                {next.lesson.levelCode} · {next.lesson.unitTitle}
                {next.lesson.estimatedMinutes ? ` · about ${next.lesson.estimatedMinutes} min` : ""}
              </p>
              <p className="text-muted mt-2">{next.lesson.objective}</p>
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
                  Lessons at your level ({snapshot.level}) are planned but not written yet. Meanwhile, these lessons are
                  a quick way to check the basics.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted mt-3 text-sm">No unfinished lessons right now.</p>
          )}
          {inProgress.length > 0 ? (
            <div className="mt-4">
              <p className="text-ink text-sm font-medium">Topics you&apos;re working on</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {inProgress.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Badge tone={c.state === "practicing" ? "primary" : "neutral"}>
                      {c.name} · {STATE_LABEL[c.state]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {next.lesson ? (
          <Link href={`/app/learn/${next.lesson.slug}`} className={buttonClasses({ size: "lg" })}>
            {next.lesson.answered > 0 ? "Continue lesson" : "Start lesson"} <ArrowRight aria-hidden />
          </Link>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="plan-heading" className={card}>
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="text-primary size-5" />
              <h2 id="plan-heading" className={cardHeading}>
                Recommended for you
              </h2>
            </div>
            {recs.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {recs.map((r, i) => (
                  <li key={r.href} className="border-border rounded-md border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-ink font-medium">
                          <span className="text-muted mr-2 text-sm">{i + 1}.</span>
                          {r.title}
                        </p>
                        <p className="text-muted mt-1 text-sm">
                          <span className="sr-only">Why: </span>
                          {r.reason}
                        </p>
                        <p className="text-muted mt-1 text-xs">About {r.minutes} min</p>
                      </div>
                      <Link
                        href={r.href}
                        className={buttonClasses({ variant: i === 0 ? "primary" : "secondary", size: "sm" })}
                      >
                        Go <ArrowRight aria-hidden />
                        <span className="sr-only">: {r.title}</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            ) : allDone ? (
              <p className="text-ink mt-3 flex items-start gap-2">
                <PartyPopper aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
                You&apos;ve finished every lesson available so far, and nothing is due. New lessons are being added.
              </p>
            ) : (
              <p className="text-muted mt-3">No lessons are available yet.</p>
            )}
          </section>

          <section aria-labelledby="skills-heading" className={card}>
            <h2 id="skills-heading" className={cardHeading}>
              Skill progress
            </h2>
            <p className="text-muted mt-1 text-sm">
              Counts the topics available so far in each skill by how well you know them.
            </p>
            {data.skills.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {data.skills.map((s) => (
                  <li key={s.skill}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-ink font-medium">{SKILL_NAMES[s.skill]}</span>
                      <span className="text-muted text-sm">
                        {s.counts.mastered} mastered · {s.counts.practicing} practising · {s.counts.learning} learning ·{" "}
                        {s.counts.new} not started
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-2"
                      tone="success"
                      value={s.counts.mastered + s.counts.practicing * 0.5}
                      max={s.total}
                      label={`${SKILL_NAMES[s.skill]}: ${s.counts.mastered} of ${s.total} topics mastered`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-3 text-sm">No topics yet.</p>
            )}
            <details className="mt-4 text-sm">
              <summary className="text-primary cursor-pointer font-medium">What these measure</summary>
              <ul className="text-muted mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-ink">Learning</strong>: you&apos;ve seen the topic or answered a few
                  questions.
                </li>
                <li>
                  <strong className="text-ink">Practising</strong>: mostly correct answers, including some on your own.
                </li>
                <li>
                  <strong className="text-ink">Mastered</strong>: remembered in spaced reviews on two separate days,
                  without help, with high recent accuracy. A wrong review moves it back to practising.
                </li>
                <li>
                  Only topics with a written lesson are counted. Listening and reading accuracy and speaking practice
                  are shown on the Progress page.
                </li>
              </ul>
            </details>
            <Link href="/app/progress" className={`${buttonClasses({ variant: "ghost", size: "sm" })} mt-2`}>
              See detailed progress
            </Link>
          </section>

          <section aria-labelledby="mistakes-heading" className={card}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <NotebookPen aria-hidden className="text-primary size-5" />
                <h2 id="mistakes-heading" className={cardHeading}>
                  Recent mistakes to fix
                </h2>
              </div>
              <Link href="/app/mistakes" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                All mistakes
              </Link>
            </div>
            {mistakes.length > 0 ? (
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
            ) : (
              <p className="text-muted mt-3 text-sm">
                {data.hasActivity ? "No open mistakes — nice work." : "Mistakes you make in lessons will appear here."}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="reviews-heading" className={card}>
            <div className="flex items-center gap-2">
              <Layers aria-hidden className="text-primary size-5" />
              <h2 id="reviews-heading" className={cardHeading}>
                Reviews
              </h2>
            </div>
            <p className="text-ink mt-3 text-2xl font-semibold">{reviews.dueNow}</p>
            <p className="text-muted text-sm">due now</p>
            <p className="text-muted mt-3 text-sm">
              {reviews.total === 0
                ? "Exercises you answer in lessons come back here for review the next day."
                : reviews.dueNow > 0
                  ? "A few minutes of recall now keeps what you learned from fading."
                  : reviews.nextDue
                    ? `Next review ${reviews.nextDue.label}.`
                    : "Nothing scheduled."}
            </p>
            {reviews.dueNow > 0 ? (
              <Link href="/app/review" className={`${buttonClasses()} mt-4 w-full`}>
                Start reviewing
              </Link>
            ) : null}
          </section>

          <section aria-labelledby="week-heading" className={card}>
            <div className="flex items-center gap-2">
              <CalendarCheck aria-hidden className="text-primary size-5" />
              <h2 id="week-heading" className={cardHeading}>
                This week
              </h2>
            </div>
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

          <section aria-labelledby="challenges-heading" className={card}>
            <div className="flex items-center gap-2">
              <Trophy aria-hidden className="text-primary size-5" />
              <h2 id="challenges-heading" className={cardHeading}>
                Challenges
              </h2>
            </div>
            <ul className="mt-3 space-y-3">
              {data.challenges.map((c) => (
                <li key={c.challenge.slug} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink font-medium">{c.challenge.title}</span>
                    {c.completedAt ? (
                      <Badge tone="success">Done</Badge>
                    ) : (
                      <span className="text-muted">
                        {c.progress.current}/{c.progress.target}
                      </span>
                    )}
                  </div>
                  <ProgressBar
                    className="mt-1.5"
                    tone={c.completedAt ? "success" : "primary"}
                    value={c.completedAt ? c.progress.target : c.progress.current}
                    max={c.progress.target}
                    label={`${c.challenge.title} progress`}
                  />
                </li>
              ))}
            </ul>
            <Link href="/app/challenges" className={`${buttonClasses({ variant: "ghost", size: "sm" })} mt-3`}>
              See challenges
            </Link>
          </section>

          {data.gamification ? (
            <section aria-labelledby="achievements-heading" className={card}>
              <div className="flex items-center gap-2">
                <Award aria-hidden className="text-primary size-5" />
                <h2 id="achievements-heading" className={cardHeading}>
                  Achievements
                </h2>
              </div>
              {data.achievements.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {data.achievements.slice(0, 4).map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="text-ink font-medium">{a.title}</p>
                      <p className="text-muted">
                        {a.description} · {dateFmt.format(a.earnedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-3 text-sm">
                  Achievements are earned from real milestones, like finishing a lesson or remembering a topic in
                  review.
                </p>
              )}
            </section>
          ) : null}

          {!placement ? (
            <section aria-labelledby="placement-heading" className={card}>
              <div className="flex items-center gap-2">
                <Compass aria-hidden className="text-primary size-5" />
                <h2 id="placement-heading" className={cardHeading}>
                  Not sure of your level?
                </h2>
              </div>
              <p className="text-muted mt-2 text-sm">
                A 10-minute placement check estimates your grammar, vocabulary and reading level. It&apos;s optional.
              </p>
              <Link href="/app/placement" className={`${buttonClasses({ variant: "secondary", size: "sm" })} mt-3`}>
                Take the placement check
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="setup-heading" className={card}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="setup-heading" className={cardHeading}>
                Your setup
              </h2>
              <Link href="/app/settings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                <Settings aria-hidden /> Change
              </Link>
            </div>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Daily study goal</dt>
                <dd className="text-ink font-medium">{data.dailyMinutes} minutes</dd>
              </div>
              <div>
                <dt className="text-muted">What you want English for</dt>
                <dd className="text-ink">{goalLabels.length > 0 ? goalLabels.join(", ") : "Not chosen yet"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </Container>
  );
}
