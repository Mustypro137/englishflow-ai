import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { byClosestLevel, findReading, labContent } from "@/lib/labs/content";
import { getLabQuestions } from "@/server/db/labs";
import { savedGlossaryWords } from "@/server/db/vocabulary";
import { requireLearner } from "@/server/labs/guard";
import { GlossarySaveButton, ReadingQuestions } from "./reading-parts";

export async function generateMetadata({ params }: PageProps<"/app/reading/[slug]">): Promise<Metadata> {
  const text = findReading((await params).slug);
  return { title: text ? `Reading: ${text.title}` : "Reading" };
}

const FOCUS_LABEL = {
  comprehension: "Understanding",
  inference: "Reading between the lines",
  vocabulary_in_context: "Words in context",
} as const;

const anchor = (word: string) => `word-${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Mark the first appearance of each glossary word, linking to its definition. */
function markGlossary(paragraphs: string[], words: string[]) {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}])(${escaped.join("|")})(?![\\p{L}])`, "giu");
  const used = new Set<string>();
  return paragraphs.map((p) => {
    const parts: (string | { word: string; text: string })[] = [];
    let last = 0;
    for (const m of p.matchAll(pattern)) {
      const word = sorted.find((w) => w.toLowerCase() === m[0].toLowerCase().replace(/’/g, "'"));
      if (!word || used.has(word)) continue;
      used.add(word);
      if (m.index > last) parts.push(p.slice(last, m.index));
      parts.push({ word, text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < p.length) parts.push(p.slice(last));
    return parts;
  });
}

export default async function ReadingTextPage({ params }: PageProps<"/app/reading/[slug]">) {
  const { user, profile } = await requireLearner();
  const text = findReading((await params).slug);
  if (!text) notFound();
  const [questions, saved] = await Promise.all([
    getLabQuestions(text.questions.map((q) => q.exercise.slug)),
    savedGlossaryWords(user.id, text.glossary),
  ]);
  const focusBySlug = new Map(text.questions.map((q) => [q.exercise.slug, FOCUS_LABEL[q.focus]] as const));
  const ordered = byClosestLevel(labContent().readingTexts, profile.estimatedLevel);
  const next = ordered[(ordered.findIndex((t) => t.slug === text.slug) + 1) % ordered.length];
  const marked = markGlossary(
    text.paragraphs,
    text.glossary.map((g) => g.word),
  );

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/reading" className="text-primary hover:underline">
          Reading
        </Link>
        <span className="text-muted"> / {text.level}</span>
      </nav>
      <div className="space-y-2">
        <Badge tone="primary">{text.level}</Badge>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{text.title}</h1>
        <p className="text-muted text-sm">Read the whole text first. Underlined words are explained below the text.</p>
      </div>

      <article className="border-border bg-surface prose-reading space-y-4 rounded-lg border p-5 sm:p-6">
        {marked.map((parts, i) => (
          <p key={i} className="text-ink whitespace-pre-line">
            {parts.map((part, k) =>
              typeof part === "string" ? (
                <span key={k}>{part}</span>
              ) : (
                <a
                  key={k}
                  href={`#${anchor(part.word)}`}
                  className="decoration-primary text-ink underline decoration-dotted decoration-2 underline-offset-4"
                >
                  {part.text}
                </a>
              ),
            )}
          </p>
        ))}
      </article>

      <section aria-labelledby="glossary-heading" className="space-y-3">
        <h2 id="glossary-heading" className="text-ink text-lg font-semibold">
          Words in this text
        </h2>
        <p className="text-muted text-sm">
          Saving a word adds it to your review with the sentence from this text, so you remember it in context.
        </p>
        <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
          {text.glossary.map((g) => (
            <li
              key={g.word}
              id={anchor(g.word)}
              tabIndex={-1}
              className="target:bg-primary-soft flex flex-wrap items-start justify-between gap-3 p-4 focus:outline-none"
            >
              <div className="min-w-0 flex-1">
                <p className="text-ink font-semibold">{g.word}</p>
                <p className="text-muted text-sm">{g.definition}</p>
              </div>
              <GlossarySaveButton textSlug={text.slug} word={g.word} initiallySaved={saved.has(g.word)} />
            </li>
          ))}
        </ul>
      </section>

      <ReadingQuestions
        textSlug={text.slug}
        questions={questions.map((q) => ({ exercise: q.exercise, focus: focusBySlug.get(q.slug) ?? null }))}
        expected={text.questions.length}
        next={next && next.slug !== text.slug ? { slug: next.slug, title: next.title } : null}
      />
    </Container>
  );
}
