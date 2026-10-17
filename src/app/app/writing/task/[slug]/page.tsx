import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WritingEditor } from "@/components/labs/writing-editor";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { findWritingTask } from "@/lib/labs/content";
import { listDrafts } from "@/server/db/writing";
import { requireLearner } from "@/server/labs/guard";
import { DraftList } from "../../draft-list";

export async function generateMetadata({ params }: PageProps<"/app/writing/task/[slug]">): Promise<Metadata> {
  const task = findWritingTask((await params).slug);
  return { title: task ? `Writing: ${task.title}` : "Writing" };
}

export default async function WritingTaskPage({ params }: PageProps<"/app/writing/task/[slug]">) {
  const { user } = await requireLearner();
  const task = findWritingTask((await params).slug);
  if (!task) notFound();
  const drafts = await listDrafts(user.id, { taskSlug: task.slug });

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/writing" className="text-primary hover:underline">
          Writing
        </Link>
        <span className="text-muted"> / {task.level}</span>
      </nav>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{task.level}</Badge>
          <Badge>
            {task.minWords}–{task.maxWords} words
          </Badge>
        </div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{task.title}</h1>
        <p className="text-ink">{task.prompt}</p>
        <div>
          <p className="text-ink text-sm font-semibold">Include:</p>
          <ul className="text-ink list-disc space-y-1 pl-6 text-sm">
            {task.guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      </div>

      <section aria-labelledby="write-heading" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="write-heading" className="text-ink mb-3 text-lg font-semibold">
          Write your first draft
        </h2>
        <p className="text-muted mb-4 text-sm">
          Write on your own first — no translator or model answer. Mistakes are useful: they show what to practise.
        </p>
        <WritingEditor
          kind="task"
          taskSlug={task.slug}
          minWords={task.minWords}
          maxWords={task.maxWords}
          submitLabel="Save draft"
        />
      </section>

      {drafts.length ? (
        <section aria-labelledby="drafts-heading" className="space-y-3">
          <h2 id="drafts-heading" className="text-ink text-lg font-semibold">
            Your drafts for this task
          </h2>
          <DraftList drafts={drafts.map((d) => ({ ...d, heading: task.title }))} empty="" />
        </section>
      ) : null}
    </Container>
  );
}
