import { Check, Lightbulb, X } from "lucide-react";
import type { LessonBlock } from "@content/schemas";
import { RichText } from "./rich-text";

/** Renders a lesson's explanation blocks: paragraphs, rules, examples, tables and common mistakes. */
export function LessonBody({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="prose-reading text-ink/90">
          <RichText text={block.text} />
        </p>
      );
    case "rule":
      return (
        <div className="border-primary bg-primary-soft rounded-r-md border-l-4 p-4">
          <p className="text-primary-hover flex items-center gap-2 text-sm font-semibold">
            <Lightbulb aria-hidden className="size-4" />
            {block.title ?? "Rule"}
          </p>
          <p className="prose-reading text-ink mt-1">
            <RichText text={block.text} />
          </p>
        </div>
      );
    case "examples":
      return (
        <div>
          <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">{block.title ?? "Examples"}</h3>
          <ul className="mt-2 space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="border-border bg-surface rounded-md border px-4 py-3">
                <p className="text-ink font-serif text-lg">
                  <RichText text={item.text} />
                </p>
                {item.note ? <p className="text-muted mt-1 text-sm">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      );
    case "table":
      return (
        // Focusable and labelled so keyboard users can scroll wide tables on small screens.
        <div
          className="border-border overflow-x-auto rounded-md border"
          tabIndex={0}
          role="region"
          aria-label={block.caption}
        >
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <caption className="text-ink bg-sunken px-4 py-2 text-left font-semibold">{block.caption}</caption>
            <thead>
              <tr className="border-border border-b">
                {block.headers.map((h) => (
                  <th key={h} scope="col" className="text-muted px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-border bg-surface border-b last:border-b-0">
                  {row.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row" className="text-ink px-4 py-2 font-medium">
                        {cell}
                      </th>
                    ) : (
                      <td key={c} className="text-ink/90 px-4 py-2">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "mistakes":
      return (
        <div>
          <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">Common mistakes</h3>
          <ul className="mt-2 space-y-3">
            {block.items.map((m, i) => (
              <li key={i} className="border-border bg-surface rounded-md border p-4">
                <p className="text-danger flex items-start gap-2">
                  <X aria-hidden className="mt-1 size-4 shrink-0" />
                  <span>
                    <span className="sr-only">Incorrect: </span>
                    <span className="line-through decoration-1">{m.wrong}</span>
                  </span>
                </p>
                <p className="text-success mt-1 flex items-start gap-2 font-medium">
                  <Check aria-hidden className="mt-1 size-4 shrink-0" />
                  <span>
                    <span className="sr-only">Correct: </span>
                    {m.right}
                  </span>
                </p>
                <p className="text-muted mt-2 text-sm">{m.why}</p>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}
