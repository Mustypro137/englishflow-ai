/**
 * A small, safe Markdown subset for tutor replies: paragraphs, headings (shown as bold
 * lines), bulleted and numbered lists, code blocks, **bold**, *italic* and `code`.
 * The output is a plain data tree rendered by React, so model output can never inject HTML.
 */

export type Inline = { type: "text" | "strong" | "em" | "code"; text: string };

export type MdBlock =
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "heading"; content: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "code"; text: string };

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s\n][^*\n]*\*|_[^_\s\n][^_\n]*_)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      out.push({ type: "strong", text: part.slice(2, -2) });
    } else if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      out.push({ type: "code", text: part.slice(1, -1) });
    } else if (
      part.length > 2 &&
      ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))
    ) {
      out.push({ type: "em", text: part.slice(1, -1) });
    } else {
      const last = out.at(-1);
      if (last?.type === "text") last.text += part;
      else out.push({ type: "text", text: part });
    }
  }
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function parseMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i += 1; // closing fence (or end of text while streaming)
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", content: parseInline(heading[1]) });
      i += 1;
      continue;
    }
    const listType = BULLET.test(line) ? BULLET : NUMBERED.test(line) ? NUMBERED : null;
    if (listType) {
      const items: Inline[][] = [];
      while (i < lines.length && listType.test(lines[i])) {
        items.push(parseInline(listType.exec(lines[i])![1]));
        i += 1;
      }
      blocks.push({ type: "list", ordered: listType === NUMBERED, items });
      continue;
    }
    const para: Inline[][] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i]) &&
      !lines[i].trim().startsWith("```")
    ) {
      para.push(parseInline(lines[i].trim()));
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: para });
  }
  return blocks;
}
