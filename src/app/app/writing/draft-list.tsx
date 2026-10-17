import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DraftSummary } from "@/server/db/writing";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function DraftList({ drafts, empty }: { drafts: (DraftSummary & { heading: string })[]; empty: string }) {
  if (drafts.length === 0) return <p className="text-muted text-sm">{empty}</p>;
  return (
    <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
      {drafts.map((d) => (
        <li key={d.id}>
          <Link href={`/app/writing/${d.id}`} className="hover:bg-sunken block p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink font-medium">{d.heading}</span>
              {d.parentId ? <Badge>Rewrite</Badge> : null}
              {d.hasFeedback ? <Badge tone="success">Feedback</Badge> : null}
            </div>
            <p className="text-muted mt-1 text-sm">{d.excerpt}</p>
            <p className="text-muted mt-1 text-xs">
              {dateFormat.format(d.createdAt)} · {d.wordCount} {d.wordCount === 1 ? "word" : "words"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
