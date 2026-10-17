import type { Metadata } from "next";
import Link from "next/link";
import { WritingEditor } from "@/components/labs/writing-editor";
import { Container } from "@/components/ui/container";
import { listDrafts } from "@/server/db/writing";
import { requireLearner } from "@/server/labs/guard";
import { DraftList } from "../draft-list";

export const metadata: Metadata = { title: "Writing journal" };

export default async function JournalPage() {
  const { user } = await requireLearner();
  const entries = await listDrafts(user.id, { kind: "journal" });
  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/writing" className="text-primary hover:underline">
          Writing
        </Link>
      </nav>
      <div className="space-y-2">
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Writing journal</h1>
        <p className="text-muted">
          A private place to write freely. A few sentences a day builds the habit. You can ask for feedback and rewrite
          any entry.
        </p>
      </div>
      <section aria-labelledby="new-entry" className="border-border bg-surface rounded-lg border p-5">
        <h2 id="new-entry" className="text-ink mb-3 text-lg font-semibold">
          New entry
        </h2>
        <WritingEditor kind="journal" withTitle label="Entry" submitLabel="Save entry" rows={8} />
      </section>
      <section aria-labelledby="entries" className="space-y-3">
        <h2 id="entries" className="text-ink text-lg font-semibold">
          Entries
        </h2>
        <DraftList
          drafts={entries.map((e) => ({ ...e, heading: e.title ?? "Journal entry" }))}
          empty="No entries yet."
        />
      </section>
    </Container>
  );
}
