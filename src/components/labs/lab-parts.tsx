import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { DiffOp } from "@/lib/learning/text-diff";
import { cn } from "@/lib/utils/cn";

export function LabHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {children ? <div className="text-muted space-y-2">{children}</div> : null}
    </div>
  );
}

/** One item in a lab library: a link card with level, time and what the learner has done. */
export function LabItemCard({
  href,
  title,
  level,
  minutes,
  meta,
  done,
  children,
}: {
  href: string;
  title: string;
  level: string;
  minutes?: number;
  meta?: string;
  done?: string | null;
  children?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="border-border bg-surface hover:border-primary focus-visible:border-primary block h-full rounded-lg border p-4 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{level}</Badge>
          {meta ? <span className="text-muted text-xs">{meta}</span> : null}
          {minutes ? (
            <span className="text-muted inline-flex items-center gap-1 text-xs">
              <Clock aria-hidden className="size-3.5" /> {minutes} min
            </span>
          ) : null}
        </div>
        <p className="text-ink mt-2 font-semibold">{title}</p>
        {children ? <div className="text-muted mt-1 text-sm">{children}</div> : null}
        {done ? (
          <p className="text-success mt-2 flex items-center gap-1.5 text-sm">
            <CheckCircle2 aria-hidden className="size-4" /> {done}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

/** Items grouped under level headings. */
export function ByLevel<T extends { level: string }>({
  items,
  render,
  headingLevel = 2,
}: {
  items: readonly T[];
  render: (item: T) => ReactNode;
  headingLevel?: 2 | 3;
}) {
  const levels = [...new Set(items.map((i) => i.level))];
  const Heading = `h${headingLevel}` as const;
  return (
    <div className="space-y-8">
      {levels.map((level) => (
        <section key={level} aria-labelledby={`level-${level}`}>
          <Heading id={`level-${level}`} className="text-ink mb-3 text-lg font-semibold">
            Level {level}
          </Heading>
          <ul className="grid gap-3 sm:grid-cols-2">{items.filter((i) => i.level === level).map(render)}</ul>
        </section>
      ))}
    </div>
  );
}

const LABELS = {
  check: { missing: "missing: ", extra: "extra word: ", wrote: "you wrote: ", right: "should be: " },
  changes: { missing: "added: ", extra: "removed: ", wrote: "before: ", right: "now: " },
} as const;

/**
 * Word-by-word comparison. Colour is never the only signal: missing and wrong words
 * are labelled for screen readers and marked with symbols.
 * "check" compares an answer with a target; "changes" shows a rewrite (target = new text).
 */
export function DiffView({
  ops,
  className,
  mode = "check",
}: {
  ops: readonly DiffOp[];
  className?: string;
  mode?: keyof typeof LABELS;
}) {
  const label = LABELS[mode];
  return (
    <p className={cn("text-ink leading-loose", className)}>
      {ops.map((op, i) => {
        const space = i > 0 ? " " : "";
        if (op.kind === "equal") {
          return op.expected ? (
            <span key={i}>
              {space}
              {op.expected}
            </span>
          ) : null;
        }
        if (op.kind === "missing")
          return (
            <span key={i}>
              {space}
              <ins className="bg-warning-soft text-ink rounded-sm px-1 no-underline">
                <span className="sr-only">{label.missing}</span>
                {op.expected}
              </ins>
            </span>
          );
        if (op.kind === "extra")
          return (
            <span key={i}>
              {space}
              <del className="text-muted px-0.5">
                <span className="sr-only">{label.extra}</span>
                {op.actual}
              </del>
            </span>
          );
        return (
          <span key={i}>
            {space}
            <del className="text-danger px-0.5">
              <span className="sr-only">{label.wrote}</span>
              {op.actual}
            </del>{" "}
            <ins className="bg-success-soft rounded-sm px-1 no-underline">
              <span className="sr-only">{mode === "check" && op.near ? "check the spelling: " : label.right}</span>
              {op.expected}
            </ins>
          </span>
        );
      })}
    </p>
  );
}

export function DiffLegend() {
  return (
    <p className="text-muted text-xs">
      <ins className="bg-warning-soft rounded-sm px-1 no-underline">highlighted</ins> = missing word ·{" "}
      <del className="text-danger">crossed out</del> = what you wrote, followed by the right word · <del>grey</del> =
      extra word
    </p>
  );
}
