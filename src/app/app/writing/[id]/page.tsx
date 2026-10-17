import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiffView } from "@/components/labs/lab-parts";
import { WritingEditor } from "@/components/labs/writing-editor";
import { TutorSetupNotice } from "@/components/tutor/parts";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { findSentencePrompt, findWritingTask } from "@/lib/labs/content";
import { diffWords, summarizeDiff } from "@/lib/learning/text-diff";
import { isAiConfigured } from "@/server/ai/provider";
import { getDraft } from "@/server/db/writing";
import { requireLearner } from "@/server/labs/guard";
import { DeleteDraftButton, FeedbackPanel, SelfCheck } from "./draft-parts";

export const metadata: Metadata = { title: "Your writing" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function DraftPage({ params }: PageProps<"/app/writing/[id]">) {
  const { user } = await requireLearner();
  const { id } = await params;
  const draft = /^[a-z0-9]{1,64}$/i.test(id) ? await getDraft(user.id, id) : null;
  if (!draft) notFound();
  const task = draft.kind === "task" && draft.taskSlug ? findWritingTask(draft.taskSlug) : null;
  const prompt = draft.kind === "sentence" && draft.taskSlug ? findSentencePrompt(draft.taskSlug) : null;
  const configured = isAiConfigured();
  const heading =
    draft.kind === "journal" ? (draft.title ?? "Journal entry") : (task?.title ?? prompt?.pattern ?? "Your writing");
  const changes = draft.parent ? diffWords(draft.text, draft.parent.text) : null;
  const changeSummary = changes ? summarizeDiff(changes) : null;
  const back =
    draft.kind === "journal"
      ? { href: "/app/writing/journal", label: "Journal" }
      : draft.kind === "sentence"
        ? { href: "/app/sentences", label: "Sentence studio" }
        : task
          ? { href: `/app/writing/task/${task.slug}`, label: task.title }
          : { href: "/app/writing", label: "Writing" };

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/writing" className="text-primary hover:underline">
          Writing
        </Link>
        {back.href !== "/app/writing" ? (
          <>
            <span className="text-muted"> / </span>
            <Link href={back.href} className="text-primary hover:underline">
              {back.label}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {draft.version > 1 ? <Badge tone="primary">Version {draft.version}</Badge> : <Badge>First draft</Badge>}
          <Badge>
            {draft.wordCount} {draft.wordCount === 1 ? "word" : "words"}
            {task ? ` · task ${task.minWords}–${task.maxWords}` : ""}
          </Badge>
        </div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="text-muted text-sm">Saved {dateFormat.format(draft.createdAt)}</p>
        {task ? <p className="text-ink text-sm">{task.prompt}</p> : null}
        {prompt ? <p className="text-ink text-sm">{prompt.prompt}</p> : null}
      </div>

      <section aria-labelledby="text-heading" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="text-heading" className="text-muted mb-2 text-sm font-semibold">
          What you wrote
        </h2>
        <p className="text-ink prose-reading whitespace-pre-wrap" data-testid="draft-text">
          {draft.text}
        </p>
      </section>

      {changes && changeSummary ? (
        <section aria-labelledby="changes-heading" className="space-y-2">
          <h2 id="changes-heading" className="text-ink text-lg font-semibold">
            Changes since your previous version
          </h2>
          {changeSummary.exact ? (
            <p className="text-muted text-sm">No words changed.</p>
          ) : (
            <>
              <DiffView ops={changes} mode="changes" />
              <p className="text-muted text-xs">
                Highlighted words are new; crossed-out words were in your previous version.
              </p>
            </>
          )}
          <Link href={`/app/writing/${draft.parent!.id}`} className="text-primary text-sm hover:underline">
            See the previous version and its feedback
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="feedback-heading" className="space-y-4">
        <h2 id="feedback-heading" className="text-ink text-lg font-semibold">
          Feedback
        </h2>
        {configured || draft.feedback ? (
          <FeedbackPanel draftId={draft.id} initial={draft.feedback} configured={configured} />
        ) : (
          <TutorSetupNotice feature="AI writing feedback" />
        )}
        {task ? <SelfCheck checklist={task.checklist} modelAnswer={task.modelAnswer} /> : null}
        {prompt ? (
          <SelfCheck
            checklist={[`I used ${prompt.pattern}.`, "My sentence is true for me."]}
            modelAnswer={prompt.examples.join("\n")}
            modelLabel="Example sentences"
          />
        ) : null}
      </section>

      <section aria-labelledby="rewrite-heading" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="rewrite-heading" className="text-ink mb-1 text-lg font-semibold">
          Rewrite
        </h2>
        <p className="text-muted mb-4 text-sm">
          Fix the problems yourself — don&apos;t just copy a corrected version. Your rewrite is saved as a new version,
          and you can ask for feedback on it too.
        </p>
        <WritingEditor
          kind={draft.kind}
          taskSlug={draft.taskSlug}
          parentId={draft.id}
          initialText={draft.text}
          minWords={task?.minWords}
          maxWords={task?.maxWords}
          label="Your rewrite"
          submitLabel="Save rewrite"
          rows={draft.kind === "sentence" ? 3 : 10}
        />
        {draft.rewrites.length ? (
          <p className="text-muted mt-3 text-sm">
            You&apos;ve already rewritten this:{" "}
            {draft.rewrites.map((r, i) => (
              <span key={r.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/app/writing/${r.id}`} className="text-primary hover:underline">
                  rewrite {i + 1}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <DeleteDraftButton draftId={draft.id} />
    </Container>
  );
}
