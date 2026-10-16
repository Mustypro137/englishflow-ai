import { CheckCircle2, ChevronRight, Circle, CircleDot, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { type CurriculumLessonSummary, getCurriculumOverview } from "@/server/db/curriculum";
import { getCurriculumProgress, type LessonStatusForUser } from "@/server/db/learning-records";
import { getProfile } from "@/server/db/learner-profile";

export const metadata: Metadata = { title: "Curriculum" };

export default async function CurriculumPage() {
  const user = await requireUser();
  const [levels, progress, profile] = await Promise.all([
    getCurriculumOverview(),
    getCurriculumProgress(user.id),
    getProfile(user.id),
  ]);

  return (
    <Container width="narrow" className="space-y-10 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Curriculum</h1>
        <p className="text-muted mt-2">
          Your path from A1 to C2. Lessons are being written in order; those not ready yet are marked “coming soon”.
        </p>
        {profile?.estimatedLevel ? (
          <p className="text-ink mt-3 text-sm">
            Your starting level: <span className="font-semibold">{profile.estimatedLevel}</span>{" "}
            <span className="text-muted">
              ({profile.levelSource === "placement" ? "from your placement check" : "your own estimate"})
            </span>
          </p>
        ) : (
          <p className="mt-3">
            <Link href="/app/placement" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Find your starting level
            </Link>
          </p>
        )}
      </div>

      {levels.map((level) => {
        const lessons = level.modules.flatMap((m) => m.units.flatMap((u) => u.lessons));
        const published = lessons.filter((l) => l.status === "published").length;
        const isLearnerLevel = profile?.estimatedLevel === level.code;
        return (
          <section key={level.code} aria-labelledby={`level-${level.code}`} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`level-${level.code}`} className="text-ink text-xl font-semibold">
                {level.code} <span className="text-muted font-normal">· {level.title}</span>
              </h2>
              <div className="flex gap-2">
                {isLearnerLevel ? <Badge tone="primary">Your level</Badge> : null}
                <Badge tone={published > 0 ? "warning" : "neutral"}>
                  {published > 0 ? `${published} of ${lessons.length} lessons ready` : "Coming soon"}
                </Badge>
              </div>
            </div>
            <p className="text-muted text-sm">{level.description}</p>

            {level.modules.map((mod) => (
              <div key={mod.slug} className="border-border bg-surface rounded-lg border">
                <div className="border-border border-b px-4 py-3">
                  <h3 className="text-ink font-semibold">{mod.title}</h3>
                  <p className="text-muted text-sm">{mod.description}</p>
                </div>
                {mod.units.map((unit) => (
                  <div key={unit.slug} className="px-4 py-3">
                    <h4 className="text-muted text-xs font-semibold tracking-wide uppercase">{unit.title}</h4>
                    <ul className="mt-2 space-y-1">
                      {unit.lessons.map((lesson) => (
                        <LessonRow key={lesson.slug} lesson={lesson} status={progress[lesson.id]} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </Container>
  );
}

function LessonRow({ lesson, status }: { lesson: CurriculumLessonSummary; status?: LessonStatusForUser }) {
  if (lesson.status !== "published") {
    return (
      <li className="text-muted flex items-center gap-3 rounded-md px-2 py-2">
        <Circle aria-hidden className="size-4 shrink-0 opacity-50" />
        <span className="flex-1">{lesson.title}</span>
        <span className="text-xs">Coming soon</span>
      </li>
    );
  }
  const state = status?.completed ? "completed" : status && status.answered > 0 ? "in_progress" : "not_started";
  const Icon = state === "completed" ? CheckCircle2 : state === "in_progress" ? CircleDot : Circle;
  return (
    <li>
      <Link
        href={`/app/learn/${lesson.slug}`}
        className="hover:bg-sunken group flex items-center gap-3 rounded-md px-2 py-2"
      >
        <Icon
          aria-hidden
          className={`size-4 shrink-0 ${state === "completed" ? "text-success" : state === "in_progress" ? "text-primary" : "text-muted"}`}
        />
        <span className="flex-1">
          <span className="text-ink font-medium">{lesson.title}</span>
          <span className="sr-only">
            {" "}
            —{" "}
            {state === "completed"
              ? "completed"
              : state === "in_progress"
                ? `${status!.answered} of ${lesson.exerciseCount} answered`
                : "not started"}
          </span>
        </span>
        <span className="text-muted hidden items-center gap-1 text-xs sm:inline-flex" aria-hidden>
          {state === "in_progress" ? (
            `${status!.answered}/${lesson.exerciseCount}`
          ) : state === "completed" ? (
            "Done"
          ) : lesson.estimatedMinutes ? (
            <>
              <Clock className="size-3" /> {lesson.estimatedMinutes} min
            </>
          ) : null}
        </span>
        <ChevronRight aria-hidden className="text-muted size-4 group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
