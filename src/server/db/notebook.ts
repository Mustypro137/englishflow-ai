import "server-only";
import type { FlashcardInput, NoteInput } from "@/lib/validation/notebook";
import { newCard } from "@/lib/learning/srs/scheduler";
import { describeDue } from "@/lib/learning/time";
import { prisma } from "./client";

/*
 * Personal notebook: flashcards, notes (grammar notes and saved sentences) and
 * lesson bookmarks. Updates and deletes match on both id AND userId, so a learner
 * can never change another learner's records even with a guessed id.
 */

// --- Flashcards ---------------------------------------------------------------

export interface FlashcardView {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueLabel: string | null;
}

export async function listFlashcards(userId: string, timeZone: string, now = new Date()): Promise<FlashcardView[]> {
  const rows = await prisma.flashcard.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { reviewItem: { select: { dueAt: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    front: r.front,
    back: r.back,
    note: r.note,
    dueLabel: r.reviewItem ? describeDue(r.reviewItem.dueAt, now, timeZone) : null,
  }));
}

export async function createFlashcard(userId: string, input: FlashcardInput, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.flashcard.create({ data: { userId, ...input } });
    await tx.reviewItem.create({ data: { userId, itemType: "flashcard", flashcardId: card.id, ...newCard(now) } });
    return card.id;
  });
}

export async function updateFlashcard(userId: string, id: string, input: FlashcardInput): Promise<boolean> {
  const { count } = await prisma.flashcard.updateMany({ where: { id, userId }, data: input });
  return count === 1;
}

export async function deleteFlashcard(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.flashcard.deleteMany({ where: { id, userId } });
  return count === 1;
}

// --- Notes --------------------------------------------------------------------

export interface NoteView {
  id: string;
  kind: "grammar_note" | "saved_sentence";
  body: string;
  lesson: { slug: string; title: string } | null;
  updatedAt: Date;
}

export async function listNotes(userId: string): Promise<NoteView[]> {
  const rows = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { lesson: { select: { slug: true, title: true } } },
  });
  return rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, lesson: r.lesson, updatedAt: r.updatedAt }));
}

async function lessonIdForSlug(slug: string | null | undefined): Promise<string | null> {
  if (!slug) return null;
  const lesson = await prisma.lesson.findFirst({ where: { slug, archivedAt: null }, select: { id: true } });
  return lesson?.id ?? null;
}

export async function createNote(userId: string, input: NoteInput): Promise<string> {
  const lessonId = await lessonIdForSlug(input.lessonSlug);
  const note = await prisma.note.create({ data: { userId, kind: input.kind, body: input.body, lessonId } });
  return note.id;
}

export async function updateNote(userId: string, id: string, input: NoteInput): Promise<boolean> {
  const lessonId = await lessonIdForSlug(input.lessonSlug);
  const { count } = await prisma.note.updateMany({
    where: { id, userId },
    data: { kind: input.kind, body: input.body, lessonId },
  });
  return count === 1;
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.note.deleteMany({ where: { id, userId } });
  return count === 1;
}

// --- Bookmarks ----------------------------------------------------------------

export async function isBookmarked(userId: string, lessonId: string): Promise<boolean> {
  return (await prisma.bookmark.count({ where: { userId, lessonId } })) > 0;
}

/** Toggle a bookmark on a published lesson. Returns the new state. */
export async function toggleBookmark(userId: string, lessonSlug: string): Promise<boolean> {
  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, status: "published", archivedAt: null },
    select: { id: true },
  });
  if (!lesson) return false;
  const { count } = await prisma.bookmark.deleteMany({ where: { userId, lessonId: lesson.id } });
  if (count > 0) return false;
  await prisma.bookmark.create({ data: { userId, lessonId: lesson.id } });
  return true;
}

export async function listBookmarks(userId: string) {
  const rows = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { lesson: { select: { slug: true, title: true, objective: true } } },
  });
  return rows.map((r) => r.lesson);
}
