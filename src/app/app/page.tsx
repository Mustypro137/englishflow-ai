import { ArrowRight, Compass, PartyPopper, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { pickNextLesson } from "@/lib/learning/next-lesson";
import { GOALS } from "@/lib/validation/profile";
import { requireUser } from "@/server/auth/session";
import { getCurriculumOverview } from "@/server/db/curriculum";
import { getCurriculumProgress, getLatestPlacement } from "@/server/db/learning-records";
import { getPreferences, getProfile } from "@/server/db/learner-profile";

export default async function LearnerHomePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const [prefs, levels, progress, placement] = await Promise.all([
    getPreferences(user.id),
    getCurriculumOverview(),
    getCurriculumProgress(user.id),
    getLatestPlacement(user.id),
  ]);

  const next = pickNextLesson(levels, (id) => progress[id]?.completed ?? false, profile.estimatedLevel);
  const nextStatus = next.lesson ? progress[next.lesson.id] : undefined;
  const goalLabels = GOALS.filter((g) => profile.goals.includes(g.value)).map((g) => g.label);
  const levelLabel =
    profile.levelSource === "placement" ? "From your placement check (an estimate)" : "Your own estimate";

  return (
    <Container width="narrow" className="space-y-8 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {profile.displayName}</h1>
        <p className="text-muted mt-2">Pick up where you left off.</p>
      </div>

      <section aria-labelledby="continue-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <h2 id="continue-heading" className="text-muted text-sm font-semibold tracking-wide uppercase">
          Continue learning
        </h2>
        {next.allDone ? (
          <div className="mt-3 flex items-start gap-3">
            <PartyPopper aria-hidden className="text-primary mt-1 size-5 shrink-0" />
            <p className="text-ink">
              You have answered every exercise in the lessons available so far. New lessons are being added — reviews of
              what you learned are coming next.
            </p>
          </div>
        ) : next.lesson ? (
          <div className="mt-3 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{next.lesson.levelCode}</Badge>
                {nextStatus && nextStatus.answered > 0 ? (
                  <span className="text-muted text-sm">
                    {nextStatus.answered} of {next.lesson.exerciseCount} answered
                  </span>
                ) : (
                  <span className="text-muted text-sm">Not started</span>
                )}
              </div>
              <p className="text-ink mt-2 text-lg font-semibold">{next.lesson.title}</p>
              <p className="text-muted mt-1 text-sm">{next.lesson.objective}</p>
            </div>
            {next.belowLearnerLevel ? (
              <p className="bg-warning-soft text-ink rounded-md p-3 text-sm">
                Lessons at your level ({profile.estimatedLevel}) are planned but not written yet. Meanwhile, these A1
                lessons are a quick way to check the basics.
              </p>
            ) : null}
            <Link href={`/app/learn/${next.lesson.slug}`} className={buttonClasses()}>
              {nextStatus && nextStatus.answered > 0 ? "Continue lesson" : "Start lesson"} <ArrowRight aria-hidden />
            </Link>
          </div>
        ) : (
          <p className="text-muted mt-3">No lessons are available yet.</p>
        )}
      </section>

      {!placement ? (
        <section
          aria-labelledby="placement-heading"
          className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:p-6"
        >
          <Compass aria-hidden className="text-primary size-8 shrink-0" />
          <div className="flex-1">
            <h2 id="placement-heading" className="text-ink font-semibold">
              Not sure where to start?
            </h2>
            <p className="text-muted mt-1 text-sm">
              A 10-minute placement check estimates your grammar, vocabulary and reading level. It is optional.
            </p>
          </div>
          <Link href="/app/placement" className={buttonClasses({ variant: "secondary" })}>
            Take the placement check
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="setup-heading" className="border-border bg-surface rounded-lg border p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="setup-heading" className="text-ink text-lg font-semibold">
            Your learning setup
          </h2>
          <Link href="/app/settings" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <Settings aria-hidden /> Change
          </Link>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted text-sm">Starting level</dt>
            <dd className="text-ink mt-1 flex flex-wrap items-center gap-2">
              {profile.estimatedLevel ? (
                <>
                  <span className="font-medium">{profile.estimatedLevel}</span>
                  <Badge>{levelLabel}</Badge>
                </>
              ) : (
                <span>Not set yet — you can start from the beginning</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Daily study goal</dt>
            <dd className="text-ink mt-1 font-medium">{prefs.dailyMinutes} minutes</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted text-sm">What you want English for</dt>
            <dd className="text-ink mt-1">{goalLabels.length > 0 ? goalLabels.join(", ") : "Not chosen yet"}</dd>
          </div>
        </dl>
      </section>
    </Container>
  );
}
