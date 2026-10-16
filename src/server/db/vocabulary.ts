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
  }));
}

export async function getSavedEntryIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.savedWord.findMany({ where: { userId }, select: { vocabularyEntryId: true } });
  return new Set(rows.map((r) => r.vocabularyEntryId));
}

/** Save a word and schedule it (it can be reviewed straight away). Saving twice is harmless. */
export async function saveWord(userId: string, entryId: string, now = new Date()): Promise<boolean> {
  const entry = await prisma.vocabularyEntry.findFirst({
    where: { id: entryId, archivedAt: null },
    select: { id: true },
  });
  if (!entry) return false;
  await prisma.$transaction(async (tx) => {
    const saved = await tx.savedWord.upsert({
      where: { userId_vocabularyEntryId: { userId, vocabularyEntryId: entryId } },
      create: { userId, vocabularyEntryId: entryId },
      update: {},
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
