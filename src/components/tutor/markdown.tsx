import { Fragment } from "react";
import { type Inline, type MdBlock, parseMarkdown } from "@/lib/ai/markdown";

/** Renders tutor output from the safe Markdown subset. Text is always escaped by React. */
export function TutorMarkdown({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <p className="text-ink font-semibold">
          <Inlines items={block.content} />
        </p>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inlines items={item} />
            </li>
          ))}
        </List>
      );
    }
    case "code":
      return (
        <pre className="bg-sunken overflow-x-auto rounded-md p-3 text-sm">
          <code>{block.text}</code>
        </pre>
      );
    case "paragraph":
      return (
        <p>
          {block.lines.map((line, i) => (
            <Fragment key={i}>
              {i > 0 ? <br /> : null}
              <Inlines items={line} />
            </Fragment>
          ))}
        </p>
      );
  }
}

function Inlines({ items }: { items: Inline[] }) {
  return items.map((t, i) =>
    t.type === "strong" ? (
      <strong key={i} className="text-ink font-semibold">
        {t.text}
      </strong>
    ) : t.type === "em" ? (
      <em key={i}>{t.text}</em>
    ) : t.type === "code" ? (
      <code key={i} className="bg-sunken rounded px-1 py-0.5 text-[0.9em]">
        {t.text}
      </code>
    ) : (
      <Fragment key={i}>{t.text}</Fragment>
    ),
  );
}
