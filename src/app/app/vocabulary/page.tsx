import { Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/db/learner-profile";
import { getSavedEntryIds, getSavedWords, getVocabularyEntries } from "@/server/db/vocabulary";
import { SaveWordButton } from "./save-word-button";

export const metadata: Metadata = { title: "Vocabulary" };

export default async function VocabularyPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "UTC";
  const [entries, savedIds, savedWords] = await Promise.all([
    getVocabularyEntries(),
    getSavedEntryIds(user.id),
    getSavedWords(user.id, tz),
  ]);
  const topics = [...new Set(entries.map((e) => e.topic))];

  return (
    <Container width="narrow" className="space-y-10 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Vocabulary</h1>
        <p className="text-muted mt-2">
          Learn words in context, with examples and the words they are often used with. Save a word to practise it in
          your reviews.
        </p>
        <p className="text-muted mt-3 flex items-start gap-2 text-xs">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          A1 words so far. Pronunciation is British English. Draft content awaiting review by an English teacher.
        </p>
      </div>

      <section aria-labelledby="my-words-heading" className="border-border bg-surface rounded-lg border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="my-words-heading" className="text-ink text-lg font-semibold">
            My words <span className="text-muted font-normal">({savedWords.length})</span>
          </h2>
          {savedWords.length > 0 ? (
            <Link href="/app/review" className={buttonClasses({ size: "sm" })}>
              Review now
            </Link>
          ) : null}
        </div>
        {savedWords.length === 0 ? (
          <p className="text-muted mt-2 text-sm">No saved words yet. Use the Save button next to any word below.</p>
        ) : (
          <ul className="divide-border mt-3 divide-y">
            {savedWords.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="text-ink font-medium">{w.headword}</span>
                  <span className="text-muted"> — {w.definition}</span>
                </span>
                <span className="text-muted shrink-0">Next review: {w.dueLabel ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {topics.map((topic) => (
        <section key={topic} aria-labelledby={`topic-${topic}`}>
          <h2 id={`topic-${topic}`} className="text-ink text-xl font-semibold">
            {topic}
          </h2>
          <ul className="mt-4 space-y-3">
            {entries
              .filter((e) => e.topic === topic)
              .map((e) => (
                <li key={e.id} className="border-border bg-surface rounded-lg border p-4">
                  <article aria-labelledby={`word-${e.slug}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 id={`word-${e.slug}`} className="text-ink font-serif text-xl">
                          {e.headword}
                        </h3>
                        <p className="text-muted text-sm">
                          {e.partOfSpeech}
                          {e.ipa ? <span> · {e.ipa}</span> : null} <Badge className="ml-1">{e.levelCode}</Badge>
                        </p>
                      </div>
                      <SaveWordButton entryId={e.id} headword={e.headword} initiallySaved={savedIds.has(e.id)} />
                    </div>
                    <p className="text-ink mt-2">{e.definition}</p>
                    <details className="group mt-2">
                      <summary className="text-primary cursor-pointer rounded-sm text-sm font-medium">
                        Examples and usage
                      </summary>
                      <div className="mt-2 space-y-2 text-sm">
                        <ul className="text-ink list-disc space-y-1 pl-5 font-serif text-base">
                          {e.examples.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                        <p className="text-muted">
                          <span className="text-ink font-medium">Often used: </span>
                          {e.collocations.join(" · ")}
                        </p>
                        {e.usageNote ? <p className="text-muted">{e.usageNote}</p> : null}
                        {e.commonErrors.map((err) => (
                          <p key={err.wrong} className="text-muted">
                            <span className="sr-only">Incorrect: </span>
                            <span className="text-danger line-through">{err.wrong}</span>{" "}
                            <span className="sr-only">Correct: </span>
                            <span className="text-success font-medium">{err.right}</span> — {err.why}
                          </p>
                        ))}
                      </div>
                    </details>
                  </article>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </Container>
  );
}
