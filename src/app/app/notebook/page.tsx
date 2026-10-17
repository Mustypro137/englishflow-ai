import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getCurriculumOverview } from "@/server/db/curriculum";
import { getProfile } from "@/server/db/learner-profile";
import { listBookmarks, listFlashcards, listNotes } from "@/server/db/notebook";
import { getSavedWords } from "@/server/db/vocabulary";
import { FlashcardForm, FlashcardItem, NoteForm, NoteItem } from "./notebook-forms";

export const metadata: Metadata = { title: "Notebook" };

export default async function NotebookPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "UTC";
  const [flashcards, notes, bookmarks, savedWords, levels] = await Promise.all([
    listFlashcards(user.id, tz),
    listNotes(user.id),
    listBookmarks(user.id),
    getSavedWords(user.id, tz),
    getCurriculumOverview(),
  ]);
  const lessons = levels.flatMap((l) =>
    l.modules.flatMap((m) =>
      m.units.flatMap((u) =>
        u.lessons.filter((x) => x.status === "published").map((x) => ({ slug: x.slug, title: x.title })),
      ),
    ),
  );

  return (
    <Container width="narrow" className="space-y-10 py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Notebook</h1>
        <p className="text-muted mt-2">Your own cards, notes and bookmarks. Everything here is private to you.</p>
      </div>

      <nav aria-label="Notebook sections" className="flex flex-wrap gap-2 text-sm">
        {[
          ["#flashcards", `Flashcards (${flashcards.length})`],
          ["#notes", `Notes (${notes.length})`],
          ["#bookmarks", `Bookmarks (${bookmarks.length})`],
        ].map(([href, label]) => (
          <a key={href} href={href} className="border-border bg-surface hover:bg-sunken rounded-md border px-3 py-1.5">
            {label}
          </a>
        ))}
        <Link href="/app/vocabulary" className="border-border bg-surface hover:bg-sunken rounded-md border px-3 py-1.5">
          Saved words ({savedWords.length})
        </Link>
        <Link href="/app/mistakes" className="border-border bg-surface hover:bg-sunken rounded-md border px-3 py-1.5">
          Mistakes
        </Link>
        <Link
          href="/app/writing/journal"
          className="border-border bg-surface hover:bg-sunken rounded-md border px-3 py-1.5"
        >
          Writing journal
        </Link>
      </nav>

      <Section
        id="flashcards"
        title="Flashcards"
        description="Make your own cards. New cards are ready to review straight away."
      >
        <div className="border-border bg-surface rounded-lg border p-5">
          <h3 className="text-ink mb-3 font-medium">New card</h3>
          <FlashcardForm />
        </div>
        {flashcards.length > 0 ? (
          <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
            {flashcards.map((c) => (
              <li key={c.id} className="p-4">
                <FlashcardItem card={c} />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        id="notes"
        title="Notes"
        description="Write grammar rules in your own words, or save sentences you want to remember."
      >
        <div className="border-border bg-surface rounded-lg border p-5">
          <h3 className="text-ink mb-3 font-medium">New note</h3>
          <NoteForm lessons={lessons} />
        </div>
        {notes.length > 0 ? (
          <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
            {notes.map((n) => (
              <li key={n.id} className="p-4">
                <NoteItem note={n} lessons={lessons} />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        id="bookmarks"
        title="Bookmarked lessons"
        description="Use the bookmark button at the top of any lesson."
      >
        {bookmarks.length === 0 ? (
          <p className="text-muted text-sm">No bookmarks yet.</p>
        ) : (
          <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
            {bookmarks.map((b) => (
              <li key={b.slug}>
                <Link href={`/app/learn/${b.slug}`} className="hover:bg-sunken block px-4 py-3">
                  <span className="text-ink font-medium">{b.title}</span>
                  <span className="text-muted block text-sm">{b.objective}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Container>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6 space-y-4">
      <div>
        <h2 id={`${id}-heading`} className="text-ink text-xl font-semibold">
          {title}
        </h2>
        <p className="text-muted mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}
