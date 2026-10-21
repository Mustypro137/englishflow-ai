import { Award, ChartLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Achievement } from "@/lib/learning/achievements";
import { ACTIVITY_WEEKS, MIN_SAMPLE, RECENT_DAYS, type Rate, WEAK_ACCURACY } from "@/lib/learning/analytics";
import { SKILL_NAMES, STATE_LABEL } from "@/lib/learning/labels";
import { requireLearner } from "@/server/labs/guard";
import { getDashboard } from "@/server/db/activity";
import { getProgressAnalytics } from "@/server/db/analytics";

export const metadata: Metadata = { title: "Progress" };

const card = "border-border bg-surface rounded-lg border p-5 sm:p-6";
const cardHeading = "text-ink text-lg font-semibold";
const noonUtc = (date: string) => new Date(`${date}T12:00:00Z`);
const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "82%", or an honest "—" with the reason when there isn't enough evidence yet. */
function Percent({ rate, unit = "answers" }: { rate: Rate; unit?: string }) {
  if (rate.value === null) {
    return (
      <span className="text-muted">
        —<span className="sr-only">: not enough {unit} yet</span>
      </span>
    );
  }
  return <span className="text-ink font-semibold tabular-nums">{Math.round(rate.value * 100)}%</span>;
}

export default async function ProgressPage() {
  const { user, profile } = await requireLearner();
  const [data, dashboard] = await Promise.all([getProgressAnalytics(user.id), getDashboard(user.id)]);

  return (
    <Container className="space-y-8 py-10">
      <header>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Progress</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Measured from your real answers and reviews. A percentage appears once there are at least {MIN_SAMPLE} answers
          behind it, so a single lucky answer never looks like 100%.
        </p>
      </header>

      {!data.hasData ? (
        <EmptyState
          icon={ChartLine}
          title="Nothing to measure yet"
          actions={
            <>
              <Link href="/app/learn" className={buttonClasses()}>
                Start a lesson
              </Link>
              <Link href="/app/review" className={buttonClasses({ variant: "secondary" })}>
                Go to review
              </Link>
            </>
          }
        >
          Answer a few lesson questions or do a review, and your skills, topics, memory and study weeks will show here.
        </EmptyState>
      ) : (
        <>
          <ActivitySection data={data.activity} />
          <SkillsSection skills={data.skills} />
          <RetentionSection retention={data.retention} />
          <ConceptsSection concepts={data.concepts} timeZone={profile.timezone} />
        </>
      )}

      {dashboard.gamification ? (
        <AchievementsSection achievements={dashboard.achievements} timeZone={profile.timezone} />
      ) : null}

      <section aria-labelledby="measures-heading" className={card}>
        <h2 id="measures-heading" className={cardHeading}>
          How these are measured
        </h2>
        <ul className="text-muted mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            <strong className="text-ink">Accuracy</strong> is the share of answers that were correct, from lessons,
            reviews, practice and the listening and reading labs. Placement questions and AI-generated practice are not
            counted.
          </li>
          <li>
            <strong className="text-ink">On your own</strong> is the share of correct answers given without a hint or a
            revealed answer.
          </li>
          <li>
            <strong className="text-ink">Remembered</strong> counts every review not rated &ldquo;Again&rdquo;.
            &ldquo;Long-term&rdquo; covers cards that had already moved to spaced review; &ldquo;New and
            relearning&rdquo; covers cards you are still learning.
          </li>
          <li>
            A topic is marked <strong className="text-ink">needs attention</strong> when fewer than{" "}
            {Math.round(WEAK_ACCURACY * 100)}% of your last {MIN_SAMPLE} or more answers on it were correct.
          </li>
          <li>
            Pronunciation practice is self-checked, so it is counted but never scored. Days and weeks follow your time
            zone ({profile.timezone}).
          </li>
        </ul>
      </section>
    </Container>
  );
}

type Analytics = Awaited<ReturnType<typeof getProgressAnalytics>>;

function ActivitySection({ data }: { data: Analytics["activity"] }) {
  const totals = data.weeks.map((w) => w.answers + w.reviews + w.practice);
  const max = Math.max(1, ...totals);
  return (
    <section aria-labelledby="activity-heading" className={card}>
      <h2 id="activity-heading" className={cardHeading}>
        Study activity
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted text-sm">Days studied, last {RECENT_DAYS} days</dt>
          <dd className="text-ink text-2xl font-semibold tabular-nums">{data.studyDaysLast30}</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Days studied in total</dt>
          <dd className="text-ink text-2xl font-semibold tabular-nums">{data.totalStudyDays}</dd>
        </div>
        {data.firstStudyDay ? (
          <div>
            <dt className="text-muted text-sm">Studying since</dt>
            <dd className="text-ink text-2xl font-semibold">{weekFmt.format(noonUtc(data.firstStudyDay))}</dd>
          </div>
        ) : null}
      </dl>
      <h3 className="text-ink mt-6 text-sm font-medium">Answers, reviews and practice per week</h3>
      <ol aria-label={`Activity per week, last ${ACTIVITY_WEEKS} weeks`} className="mt-3 flex h-36 items-end gap-1">
        {data.weeks.map((w, i) => {
          const total = totals[i];
          return (
            <li key={w.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span aria-hidden className="text-muted text-xs tabular-nums">
                {total > 0 ? total : ""}
              </span>
              <span
                aria-hidden
                className={total > 0 ? "bg-primary w-full rounded-sm" : "bg-sunken w-full rounded-sm"}
                style={{ height: total > 0 ? `${Math.max(6, (total / max) * 75)}%` : "4px" }}
              />
              <span aria-hidden className="text-muted hidden text-[0.65rem] sm:block">
                {weekFmt.format(noonUtc(w.week))}
              </span>
              <span className="sr-only">
                Week of {weekFmt.format(noonUtc(w.week))}: {w.answers} answers, {w.reviews} reviews, {w.practice}{" "}
                practice activities, on {w.studyDays} {w.studyDays === 1 ? "day" : "days"}
              </span>
            </li>
          );
        })}
      </ol>
      <p aria-hidden className="text-muted mt-1 flex justify-between text-xs sm:hidden">
        <span>{weekFmt.format(noonUtc(data.weeks[0].week))}</span>
        <span>This week</span>
      </p>
    </section>
  );
}

function SkillsSection({ skills }: { skills: Analytics["skills"] }) {
  return (
    <section aria-labelledby="skills-heading" className={card}>
      <h2 id="skills-heading" className={cardHeading}>
        By skill
      </h2>
      <ul className="divide-border mt-2 divide-y">
        {skills.map((s) => {
          const topics = Object.values(s.mastery).reduce((a, b) => a + b, 0);
          return (
            <li key={s.skill} className="py-4">
              <h3 className="text-ink font-medium">{SKILL_NAMES[s.skill]}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Answers</dt>
                  <dd className="text-ink font-semibold tabular-nums">{s.answers}</dd>
                </div>
                <div>
                  <dt className="text-muted">Accuracy</dt>
                  <dd>
                    <Percent rate={s.accuracy} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Last {RECENT_DAYS} days</dt>
                  <dd>
                    <Percent rate={s.recentAccuracy} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">On your own</dt>
                  <dd>
                    <Percent rate={s.independentShare} unit="correct answers" />
                  </dd>
                </div>
                {s.practiceSessions > 0 ? (
                  <div>
                    <dt className="text-muted">Practice sessions</dt>
                    <dd className="text-ink font-semibold tabular-nums">{s.practiceSessions}</dd>
                  </div>
                ) : null}
              </dl>
              {topics > 0 ? (
                <>
                  <ProgressBar
                    className="mt-3"
                    tone="success"
                    value={s.mastery.mastered + s.mastery.practicing * 0.5}
                    max={topics}
                    label={`${SKILL_NAMES[s.skill]}: ${s.mastery.mastered} of ${topics} topics mastered`}
                  />
                  <p className="text-muted mt-1 text-xs">
                    {topics} {topics === 1 ? "topic" : "topics"}: {s.mastery.mastered} mastered · {s.mastery.practicing}{" "}
                    practising · {s.mastery.learning} learning · {s.mastery.new} not started
                  </p>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RetentionSection({ retention }: { retention: Analytics["retention"] }) {
  return (
    <section aria-labelledby="retention-heading" className={card}>
      <h2 id="retention-heading" className={cardHeading}>
        Memory in review
      </h2>
      {retention.reviews === 0 ? (
        <p className="text-muted mt-3 text-sm">
          No reviews yet. Items you answer in lessons come back for review after a day or two.{" "}
          <Link href="/app/review" className="text-primary font-medium underline">
            Open review
          </Link>
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-muted text-sm">Remembered ({retention.reviews} reviews)</dt>
              <dd className="text-2xl">
                <Percent rate={retention.remembered} unit="reviews" />
              </dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Long-term ({retention.mature.count})</dt>
              <dd className="text-2xl">
                <Percent rate={retention.mature} unit="reviews" />
              </dd>
            </div>
            <div>
              <dt className="text-muted text-sm">New and relearning ({retention.young.count})</dt>
              <dd className="text-2xl">
                <Percent rate={retention.young} unit="reviews" />
              </dd>
            </div>
          </dl>
          <h3 className="text-ink mt-6 text-sm font-medium">Remembered per week</h3>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {retention.weeks.map((w) => (
              <li key={w.week} className="bg-sunken rounded-md px-3 py-2">
                <span className="text-muted block text-xs">Week of {weekFmt.format(noonUtc(w.week))}</span>
                {w.reviews === 0 ? (
                  <span className="text-muted">No reviews</span>
                ) : (
                  <span>
                    <Percent rate={w.remembered} unit="reviews" />{" "}
                    <span className="text-muted text-xs">of {w.reviews}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ConceptsSection({ concepts, timeZone }: { concepts: Analytics["concepts"]; timeZone: string }) {
  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone });
  return (
    <section aria-labelledby="concepts-heading" className={card}>
      <h2 id="concepts-heading" className={cardHeading}>
        By topic
      </h2>
      <p className="text-muted mt-1 text-sm">Topics you have answered questions on, those needing attention first.</p>
      {concepts.length === 0 ? (
        <p className="text-muted mt-3 text-sm">No topics practised yet.</p>
      ) : (
        <ul className="divide-border mt-2 divide-y">
          {concepts.map((c) => (
            <li key={c.slug} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="text-ink font-medium">
                  {c.name}{" "}
                  {c.needsAttention ? (
                    <Badge tone="warning" className="ml-1 align-middle">
                      Needs attention
                    </Badge>
                  ) : null}
                </p>
                <p className="text-muted text-xs">
                  {c.levelCode} · {SKILL_NAMES[c.skill]} · {STATE_LABEL[c.state]}
                  {c.lastPracticedAt ? ` · last practised ${dateFmt.format(c.lastPracticedAt)}` : ""}
                </p>
              </div>
              <p className="text-sm">
                <span className="text-muted">Recent </span>
                <Percent rate={c.recentAccuracy} />
                <span className="text-muted"> · {c.attempts} answers</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AchievementsSection({ achievements, timeZone }: { achievements: Achievement[]; timeZone: string }) {
  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone });
  return (
    <section aria-labelledby="achievements-heading" className={card}>
      <div className="flex items-center gap-2">
        <Award aria-hidden className="text-primary size-5" />
        <h2 id="achievements-heading" className={cardHeading}>
          Achievements
        </h2>
      </div>
      {achievements.length > 0 ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
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
          Achievements are earned from real milestones, like finishing a lesson or remembering a topic in review.
        </p>
      )}
    </section>
  );
}
