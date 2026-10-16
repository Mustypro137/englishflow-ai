import { BookOpen, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { stableShuffle, type ClientExercise } from "@/lib/learning/client-exercise";
import { requireUser } from "@/server/auth/session";
import { getLearnerSnapshot } from "@/server/db/activity";
import { getPracticePool } from "@/server/db/curriculum";
import { getProfile } from "@/server/db/learner-profile";
import { localDateKey } from "@/lib/learning/time";
import { PracticeSet } from "./practice-set";

export const metadata: Metadata = { title: "Mixed practice" };

const SET_SIZE = 8;

/** Take exercises from each lesson in turn so one lesson doesn't fill the whole set. */
function mix(pool: { lessonId: string; exercise: ClientExercise }[], seed: string): ClientExercise[] {
  const byLesson = new Map<string, ClientExercise[]>();
  for (const { lessonId, exercise } of stableShuffle(pool, seed)) {
    byLesson.set(lessonId, [...(byLesson.get(lessonId) ?? []), exercise]);
  }
  const queues = [...byLesson.values()];
  const out: ClientExercise[] = [];
  while (out.length < SET_SIZE && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && out.length < SET_SIZE) out.push(next);
    }
  }
  return stableShuffle(out, `${seed}:order`);
}

export default async function PracticePage({ searchParams }: PageProps<"/app/practice">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const { unit, set } = await searchParams;
  const setNumber = typeof set === "string" && /^\d{1,6}$/.test(set) ? Number(set) : 0;
  const snapshot = await getLearnerSnapshot(user.id);
  const studied = snapshot.lessons.filter((l) => l.status === "published" && l.completed);
  const unitLessons = typeof unit === "string" ? studied.filter((l) => l.unitSlug === unit) : [];
  const lessons = unitLessons.length > 0 ? unitLessons : studied;
  const unitTitle = unitLessons[0]?.unitTitle;

  if (lessons.length === 0) {
    return (
      <Container width="narrow" className="py-10">
        <EmptyState
          icon={Shuffle}
          title="Mixed practice opens after your first lesson"
          headingLevel={1}
          actions={
            <Link href="/app/learn" className={buttonClasses()}>
              <BookOpen aria-hidden /> Go to the curriculum
            </Link>
          }
        >
          Mixed practice brings back questions from lessons you&apos;ve finished, in a random order and without hints,
          so you have to recall which rule applies. Finish a lesson and it will appear here.
        </EmptyState>
      </Container>
    );
  }

  const pool = await getPracticePool(lessons.map((l) => l.id));
  const exercises = mix(pool, `${user.id}:${localDateKey(snapshot.now, snapshot.timezone)}:${setNumber}`);

  const newSet = new URLSearchParams({
    ...(unitTitle && typeof unit === "string" ? { unit } : {}),
    set: String(setNumber + 1),
  });

  return (
    <Container width="narrow" className="space-y-6 py-8 sm:py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">
          Mixed practice{unitTitle ? `: ${unitTitle}` : ""}
        </h1>
        <p className="text-muted mt-2">
          {exercises.length} questions from {lessons.length === 1 ? "1 lesson" : `${lessons.length} lessons`}{" "}
          you&apos;ve finished, mixed together and without hints. Working out which rule applies is part of the
          practice.
        </p>
      </div>
      <PracticeSet exercises={exercises} />
      <Link href={`/app/practice?${newSet.toString()}`} className={buttonClasses({ variant: "secondary" })}>
        <Shuffle aria-hidden /> New set
      </Link>
    </Container>
  );
}
