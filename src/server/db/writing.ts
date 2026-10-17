import "server-only";
import { wordCount } from "@content/labs/schemas";
import type { WritingKind } from "@/generated/prisma/client";
import { type StoredFeedback, storedFeedbackSchema } from "@/server/ai/writing-feedback";
import { prisma } from "./client";

/*
 * The learner's writing: task drafts, journal entries and studio sentences.
 * Rewrites point to the draft they improve. Every function is scoped to userId.
 */

export const MAX_WRITING_LENGTH = 3000;
export const MAX_DRAFTS = 500;

export interface DraftSummary {
  id: string;
  kind: WritingKind;
  taskSlug: string | null;
  title: string | null;
  excerpt: string;
  wordCount: number;
  hasFeedback: boolean;
  parentId: string | null;
  createdAt: Date;
}

export interface DraftView extends DraftSummary {
  text: string;
  feedback: StoredFeedback | null;
  feedbackAt: Date | null;
  parent: { id: string; text: string; feedback: StoredFeedback | null } | null;
  /** Number of the draft in its chain: 1 for the first version. */
  version: number;
  rewrites: { id: string; createdAt: Date }[];
}

function parseFeedback(raw: unknown): StoredFeedback | null {
  if (raw == null) return null;
  const parsed = storedFeedbackSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const excerpt = (text: string) => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > 120 ? `${one.slice(0, 119)}…` : one;
};

export type CreateDraftResult = { ok: true; id: string } | { ok: false; reason: "limit" | "not_found" };

export async function createDraft(
  userId: string,
  input: { kind: WritingKind; taskSlug: string | null; title: string | null; text: string; parentId: string | null },
): Promise<CreateDraftResult> {
  if (input.parentId) {
    const parent = await prisma.writingDraft.findFirst({ where: { id: input.parentId, userId }, select: { id: true } });
    if (!parent) return { ok: false, reason: "not_found" };
  }
  const count = await prisma.writingDraft.count({ where: { userId } });
  if (count >= MAX_DRAFTS) return { ok: false, reason: "limit" };
  const text = input.text.trim().slice(0, MAX_WRITING_LENGTH);
  const row = await prisma.writingDraft.create({
    data: {
      userId,
      kind: input.kind,
      taskSlug: input.taskSlug,
      title: input.title,
      text,
      wordCount: wordCount(text),
      parentId: input.parentId,
    },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

export async function listDrafts(
  userId: string,
  filter: { kind?: WritingKind; taskSlug?: string } = {},
  limit = 100,
): Promise<DraftSummary[]> {
  const rows = await prisma.writingDraft.findMany({
    where: { userId, ...filter },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      taskSlug: true,
      title: true,
      text: true,
      wordCount: true,
      feedbackAt: true,
      parentId: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    taskSlug: r.taskSlug,
    title: r.title,
    excerpt: excerpt(r.text),
    wordCount: r.wordCount,
    hasFeedback: r.feedbackAt !== null,
    parentId: r.parentId,
    createdAt: r.createdAt,
  }));
}

export async function getDraft(userId: string, id: string): Promise<DraftView | null> {
  const r = await prisma.writingDraft.findFirst({
    where: { id, userId },
    include: {
      parent: { select: { id: true, text: true, feedback: true, userId: true } },
      rewrites: { where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, createdAt: true } },
    },
  });
  if (!r) return null;
  // Count earlier versions (a chain is short; cap the walk anyway).
  let version = 1;
  let parentId = r.parentId;
  while (parentId && version < 50) {
    const p = await prisma.writingDraft.findFirst({ where: { id: parentId, userId }, select: { parentId: true } });
    if (!p) break;
    version++;
    parentId = p.parentId;
  }
  return {
    id: r.id,
    kind: r.kind,
    taskSlug: r.taskSlug,
    title: r.title,
    excerpt: excerpt(r.text),
    text: r.text,
    wordCount: r.wordCount,
    hasFeedback: r.feedbackAt !== null,
    parentId: r.parentId,
    createdAt: r.createdAt,
    feedback: parseFeedback(r.feedback),
    feedbackAt: r.feedbackAt,
    parent:
      r.parent && r.parent.userId === userId
        ? { id: r.parent.id, text: r.parent.text, feedback: parseFeedback(r.parent.feedback) }
        : null,
    version,
    rewrites: r.rewrites,
  };
}

export async function saveDraftFeedback(userId: string, id: string, feedback: StoredFeedback): Promise<boolean> {
  const { count } = await prisma.writingDraft.updateMany({
    where: { id, userId },
    data: { feedback: feedback as object, feedbackAt: new Date() },
  });
  return count > 0;
}

export async function deleteDraft(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.writingDraft.deleteMany({ where: { id, userId } });
  return count > 0;
}
