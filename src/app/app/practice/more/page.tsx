import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TutorSetupNotice } from "@/components/tutor/parts";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { isAiConfigured } from "@/server/ai/provider";
import { requireUser } from "@/server/auth/session";
import { getLearnerSnapshot } from "@/server/db/activity";
import { GENERATED_SET_SIZE, getGeneratableConcept, getGeneratedPractice } from "@/server/db/generated";
import { getProfile } from "@/server/db/learner-profile";
import { GenerateButton, GeneratedSet } from "./generated-set";

export const metadata: Metadata = { title: "More practice" };

const HONESTY =
  "These exercises are written by AI for this topic and checked automatically: they must follow the course's exercise rules, have a clear answer that our own marking accepts, and not repeat existing questions. A teacher hasn't reviewed them. Your answers are saved, but they don't change your mastery, reviews or level.";

export default async function MorePracticePage({ searchParams }: PageProps<"/app/practice/more">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const { concept: conceptParam } = await searchParams;
  const configured = isAiConfigured();
  const slug = typeof conceptParam === "string" && /^[a-z0-9-]{1,100}$/.test(conceptParam) ? conceptParam : null;
  const concept = slug ? await getGeneratableConcept(slug) : null;

  if (!concept) {
    const snapshot = await getLearnerSnapshot(user.id);
    const taught = new Set(snapshot.lessons.filter((l) => l.status === "published").flatMap((l) => l.conceptSlugs));
    const studied = snapshot.concepts.filter((c) => c.state !== "new" && taught.has(c.slug));
    return (
      <Container width="narrow" className="space-y-6 py-8 sm:py-10">
        <div>
          <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">More practice</h1>
          <p className="text-muted mt-2">
            New AI-generated exercises for a topic you&apos;ve started, at that topic&apos;s level.
          </p>
        </div>
        {!configured ? <TutorSetupNotice feature="AI-generated practice" /> : null}
        {studied.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Start a lesson first"
            actions={
              <Link href="/app/learn" className={buttonClasses()}>
                <BookOpen aria-hidden /> Go to the curriculum
              </Link>
            }
          >
            Extra practice is available for topics you&apos;ve begun in a lesson.
          </EmptyState>
        ) : (
          <section aria-labelledby="topics-heading">
            <h2 id="topics-heading" className="text-ink mb-3 text-lg font-semibold">
              Choose a topic
            </h2>
            <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
              {studied.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/app/practice/more?concept=${c.slug}`}
                    className="hover:bg-sunken flex items-center justify-between gap-3 p-4"
                  >
                    <span className="text-ink font-medium">{c.name}</span>
                    <span className="text-muted text-sm">{c.levelCode}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    );
  }

  const { exercises, answered } = await getGeneratedPractice(user.id, concept.id);
  const canGenerate = configured && exercises.length < GENERATED_SET_SIZE;

  return (
    <Container width="narrow" className="space-y-6 py-8 sm:py-10">
      <Link
        href="/app/practice/more"
        className="text-primary inline-flex items-center gap-1 text-sm font-medium underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> All topics
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">More practice: {concept.name}</h1>
          <Badge tone="accent">AI-generated</Badge>
        </div>
        <p className="text-muted text-sm">
          {concept.levelCode} · {HONESTY}
        </p>
      </div>

      {!configured ? <TutorSetupNotice feature="AI-generated practice" /> : null}

      {exercises.length > 0 ? (
        <GeneratedSet exercises={exercises} />
      ) : (
        <p className="text-muted">
          {answered > 0
            ? `You've answered all ${answered} generated exercises for this topic.`
            : "There are no generated exercises for this topic yet."}
        </p>
      )}

      {canGenerate ? (
        <GenerateButton
          concept={concept.slug}
          label={exercises.length > 0 ? "Add more exercises" : "Generate exercises"}
        />
      ) : null}
    </Container>
  );
}
