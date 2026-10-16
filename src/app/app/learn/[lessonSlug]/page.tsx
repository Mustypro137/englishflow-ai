import { ArrowLeft, Clock, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationTask } from "@/components/lesson/application-task";
import { LessonBody } from "@/components/lesson/lesson-body";
import { LessonProgressBar, LessonProgressProvider, PracticeList } from "@/components/lesson/lesson-practice";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getLessonBySlug } from "@/server/db/curriculum";
import { getLessonHistory } from "@/server/db/learning-records";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/app/learn/[lessonSlug]">) {
  const user = await requireUser();
  const { lessonSlug } = await params;
  const lesson = await getLessonBySlug(lessonSlug);
  if (!lesson) notFound();
  const { summary, byExercise } = await getLessonHistory(user.id, lesson.id);

  return (
    <LessonProgressProvider lessonSlug={lesson.slug} initial={summary}>
      <Container width="narrow" className="space-y-12 py-8 sm:py-10">
        <header className="space-y-4">
          <Link
            href="/app/learn"
            className="text-muted hover:text-ink inline-flex items-center gap-1.5 rounded-sm text-sm"
          >
            <ArrowLeft aria-hidden className="size-4" /> Curriculum
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{lesson.levelCode}</Badge>
            <span className="text-muted text-sm">{lesson.unitTitle}</span>
            {lesson.estimatedMinutes ? (
              <span className="text-muted inline-flex items-center gap-1 text-sm">
                <Clock aria-hidden className="size-3.5" /> about {lesson.estimatedMinutes} min
              </span>
            ) : null}
          </div>
          <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
          <p className="text-muted">
            <span className="text-ink font-medium">Goal: </span>
            {lesson.objective}
          </p>
          <LessonProgressBar />
          {lesson.reviewStatus !== "reviewed" ? (
            <p className="text-muted flex items-start gap-2 text-xs">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Draft lesson: written with AI assistance and awaiting review by an English teacher.
            </p>
          ) : null}
        </header>

        <Section id="learn" title="Learn" description="Read the explanation and examples before you practise.">
          <LessonBody blocks={lesson.body} />
        </Section>

        <Section
          id="guided"
          title="Guided practice"
          description="Hints are available. Try first, then check — mistakes here are part of learning."
        >
          <PracticeList exercises={lesson.exercises.guided} labelPrefix="Guided" allowHints history={byExercise} />
        </Section>

        <Section id="independent" title="Your turn" description="No hints this time. Answer on your own.">
          <PracticeList
            exercises={lesson.exercises.independent}
            labelPrefix="Practice"
            allowHints={false}
            history={byExercise}
          />
        </Section>

        <Section
          id="recall"
          title="Check your memory"
          description="Answer without scrolling up. Remembering on your own is what builds lasting knowledge."
        >
          <PracticeList
            exercises={lesson.exercises.recall}
            labelPrefix="Recall"
            allowHints={false}
            history={byExercise}
          />
        </Section>

        <Section id="apply" title="Use it" description="Write your own sentences, then compare.">
          <ApplicationTask task={lesson.application} />
        </Section>

        <Section id="mastery" title="You can do this lesson when you can…">
          <ul className="text-ink list-disc space-y-1 pl-6">
            {lesson.masteryCriteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="text-muted mt-3 text-sm">
            Answering every exercise completes the lesson. Real mastery comes from remembering it later: reviews that
            bring these points back over the coming days are the next feature being built.
          </p>
        </Section>
      </Container>
    </LessonProgressProvider>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="scroll-mt-6">
      <h2 id={`${id}-heading`} className="text-ink text-xl font-semibold">
        {title}
      </h2>
      {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
