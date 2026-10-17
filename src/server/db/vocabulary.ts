import "server-only";
import { z } from "zod";
import { newCard } from "@/lib/learning/srs/scheduler";
import { describeDue } from "@/lib/learning/time";
import { prisma } from "./client";

/*
 * Vocabulary: shared entries (content) and each learner's saved words.
 * Saving a word schedules it for review; removing it removes the schedule too.
 */

const commonErrorsSchema = z.array(z.object({ wrong: z.string(), right: z.string(), why: z.string() })).catch([]);

export interface VocabularyEntryView {
  id: string;
  slug: string;
  headword: string;
  partOfSpeech: string;
  levelCode: string;
  topic: string;
  definition: string;
  examples: string[];
  collocations: string[];
  ipa: string | null;
  usageNote: string | null;
  commonErrors: { wrong: string; right: string; why: string }[];
}

/** All published entries (content shared by every learner), grouped order: topic, then word. */
export async function getVocabularyEntries(): Promise<VocabularyEntryView[]> {
  "use cache";
  const rows = await prisma.vocabularyEntry.findMany({
    where: { archivedAt: null },
    orderBy: [{ levelCode: "asc" }, { topic: "asc" }, { headword: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    headword: r.headword,
    partOfSpeech: r.partOfSpeech,
    levelCode: r.levelCode,
    topic: r.topic,
    definition: r.definition,
    examples: r.examples,
    collocations: r.collocations,
    ipa: r.ipa,
    usageNote: r.usageNote,
    commonErrors: commonErrorsSchema.parse(r.commonErrors ?? []),
  }));
}

export interface SavedWordView {
  id: string;
  entryId: string;
  headword: string;
  definition: string;
  topic: string;
  savedAt: Date;
  dueLabel: string | null;
  sourceSentence: string | null;
  sourceTitle: string | null;
}

export async function getSavedWords(userId: string, timeZone: string, now = new Date()): Promise<SavedWordView[]> {
  const rows = await prisma.savedWord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { entry: true, reviewItem: { select: { dueAt: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    entryId: r.vocabularyEntryId,
    headword: r.entry.headword,
    definition: r.entry.definition,
    topic: r.entry.topic,
    savedAt: r.createdAt,
    dueLabel: r.reviewItem ? describeDue(r.reviewItem.dueAt, now, timeZone) : null,
    sourceSentence: r.sourceSentence,
    sourceTitle: r.sourceTitle,
  }));
}

export async function getSavedEntryIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.savedWord.findMany({ where: { userId }, select: { vocabularyEntryId: true } });
  return new Set(rows.map((r) => r.vocabularyEntryId));
}

/**
 * Save a word and schedule it (it can be reviewed straight away). Saving twice is harmless.
 * `source` keeps the sentence the word was met in (reading library); a later save updates it.
 */
export async function saveWord(
  userId: string,
  entryId: string,
  now = new Date(),
  source?: { sentence: string; title: string },
): Promise<boolean> {
  const entry = await prisma.vocabularyEntry.findFirst({
    where: { id: entryId, archivedAt: null },
    select: { id: true },
  });
  if (!entry) return false;
  await prisma.$transaction(async (tx) => {
    const saved = await tx.savedWord.upsert({
      where: { userId_vocabularyEntryId: { userId, vocabularyEntryId: entryId } },
      create: {
        userId,
        vocabularyEntryId: entryId,
        sourceSentence: source?.sentence ?? null,
        sourceTitle: source?.title ?? null,
      },
      update: source ? { sourceSentence: source.sentence, sourceTitle: source.title } : {},
    });
    const existing = await tx.reviewItem.findUnique({ where: { savedWordId: saved.id } });
    if (!existing) {
      await tx.reviewItem.create({ data: { userId, itemType: "vocabulary", savedWordId: saved.id, ...newCard(now) } });
    }
  });
  return true;
}

/** Remove a saved word (and its review schedule). Only the learner's own words. */
export async function removeSavedWord(userId: string, entryId: string): Promise<void> {
  await prisma.savedWord.deleteMany({ where: { userId, vocabularyEntryId: entryId } });
}

export type GlossarySaveResult = { saved: "word" | "flashcard" } | { saved: false };

/**
 * Save a glossary word from a reading text, with the sentence it appears in.
 * Words with a vocabulary entry become saved words; others become a flashcard
 * (once — saving again doesn't duplicate it). Both are scheduled for review.
 */
export async function saveGlossaryWord(
  userId: string,
  input: { word: string; definition: string; entrySlug: string | null; sentence: string; title: string },
  now = new Date(),
): Promise<GlossarySaveResult> {
  if (input.entrySlug) {
    const entry = await prisma.vocabularyEntry.findFirst({
      where: { slug: input.entrySlug, archivedAt: null },
      select: { id: true },
    });
    if (entry) {
      await saveWord(userId, entry.id, now, { sentence: input.sentence, title: input.title });
      return { saved: "word" };
    }
  }
  const note = `From “${input.title}”: ${input.sentence}`;
  const existing = await prisma.flashcard.findFirst({
    where: { userId, front: input.word, back: input.definition },
    select: { id: true },
  });
  if (existing) return { saved: "flashcard" };
  await prisma.$transaction(async (tx) => {
    const card = await tx.flashcard.create({
      data: { userId, front: input.word, back: input.definition, note: note.slice(0, 500) },
    });
    await tx.reviewItem.create({ data: { userId, itemType: "flashcard", flashcardId: card.id, ...newCard(now) } });
  });
  return { saved: "flashcard" };
}

/** Which glossary words this learner has already saved (as words or flashcards). */
export async function savedGlossaryWords(
  userId: string,
  glossary: readonly { word: string; definition: string; entry?: string }[],
): Promise<Set<string>> {
  const entrySlugs = glossary.flatMap((g) => (g.entry ? [g.entry] : []));
  const [words, cards] = await Promise.all([
    prisma.savedWord.findMany({
      where: { userId, entry: { slug: { in: entrySlugs } } },
      select: { entry: { select: { slug: true } } },
    }),
    prisma.flashcard.findMany({
      where: { userId, front: { in: glossary.filter((g) => !g.entry).map((g) => g.word) } },
      select: { front: true, back: true },
    }),
  ]);
  const savedSlugs = new Set(words.map((w) => w.entry.slug));
  const savedCards = new Set(cards.map((c) => `${c.front}|${c.back}`));
  return new Set(
    glossary
      .filter((g) => (g.entry ? savedSlugs.has(g.entry) : savedCards.has(`${g.word}|${g.definition}`)))
      .map((g) => g.word),
  );
}
