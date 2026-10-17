import { NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ByLevel, LabHeader, LabItemCard } from "@/components/labs/lab-parts";
import { TutorSetupNotice } from "@/components/tutor/parts";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { byClosestLevel, findSentencePrompt, findWritingTask, labContent } from "@/lib/labs/content";
import { isAiConfigured } from "@/server/ai/provider";
import { listDrafts } from "@/server/db/writing";
import { requireLearner } from "@/server/labs/guard";
import { DraftList } from "./draft-list";

export const metadata: Metadata = { title: "Writing" };

const GENRE_LABEL = {
  message: "Message",
  email: "Email",
  description: "Description",
  story: "Story",
  opinion: "Opinion",
  review: "Review",
} as const;

export default async function WritingPage() {
  const { user, profile } = await requireLearner();
  const tasks = byClosestLevel(labContent().writingTasks, profile.estimatedLevel);
  const drafts = await listDrafts(user.id);
  const configured = isAiConfigured();
  const perTask = new Map<string, number>();
  for (const d of drafts) if (d.taskSlug) perTask.set(d.taskSlug, (perTask.get(d.taskSlug) ?? 0) + 1);

  return (
    <Container className="space-y-10 py-8 sm:py-10">
      <LabHeader title="Writing">
        <p>
          Write, get feedback, then rewrite. Feedback comes in three layers: what&apos;s <strong>incorrect</strong>,
          what could sound more <strong>natural</strong>, and optional <strong>style</strong> ideas. Your meaning stays
          yours.
        </p>
      </LabHeader>
      {configured ? null : <TutorSetupNotice feature="AI writing feedback" />}
      {configured ? null : (
        <p className="text-muted -mt-6 text-sm">
          You can still write and rewrite: every task has a self-check list and a model answer to compare with.
        </p>
      )}

      <section aria-labelledby="journal-heading" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="journal-heading" className="text-ink text-lg font-semibold">
          Journal
        </h2>
        <p className="text-muted mt-1 text-sm">
          Free writing about anything — your day, your plans, something you read. Private to you.
        </p>
        <Link href="/app/writing/journal" className={buttonClasses({ variant: "secondary", className: "mt-4" })}>
          <NotebookPen aria-hidden /> Open your journal
        </Link>
      </section>

      <section aria-labelledby="tasks-heading" className="space-y-4">
        <h2 id="tasks-heading" className="text-ink text-xl font-semibold">
          Writing tasks
        </h2>
        <ByLevel
          headingLevel={3}
          items={tasks}
          render={(t) => {
            const n = perTask.get(t.slug) ?? 0;
            return (
              <LabItemCard
                key={t.slug}
                href={`/app/writing/task/${t.slug}`}
                title={t.title}
                level={t.level}
                minutes={t.estimatedMinutes}
                meta={`${GENRE_LABEL[t.genre]} · ${t.minWords}–${t.maxWords} words`}
                done={n ? `${n} ${n === 1 ? "draft" : "drafts"}` : null}
              >
                {t.prompt}
              </LabItemCard>
            );
          }}
        />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="text-ink text-xl font-semibold">
          Your writing
        </h2>
        <DraftList
          drafts={drafts.slice(0, 20).map((d) => ({
            ...d,
            heading:
              d.kind === "journal"
                ? (d.title ?? "Journal entry")
                : ((d.taskSlug && (findWritingTask(d.taskSlug)?.title ?? findSentencePrompt(d.taskSlug)?.pattern)) ??
                  "Writing"),
          }))}
          empty="Nothing yet. Choose a task or open your journal to start."
        />
      </section>
    </Container>
  );
}
