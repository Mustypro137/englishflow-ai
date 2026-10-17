import "server-only";
import { MAX_MEMORY_LENGTH, MEMORY_KINDS, type MemoryKindName } from "@/server/ai/memory-schema";
import { prisma } from "./client";

export { MAX_MEMORY_LENGTH, MEMORY_KINDS, type MemoryKindName };

/*
 * Learner memory: saved learning context the tutor may use, managed by the learner.
 * AI suggestions are stored unverified and are not used until the learner confirms them.
 */

export const MAX_MEMORIES = 50;

export interface MemoryView {
  id: string;
  kind: MemoryKindName;
  content: string;
  source: "learner" | "ai" | "system";
  verified: boolean;
  updatedAt: Date;
}

export async function listMemories(userId: string): Promise<MemoryView[]> {
  return prisma.learnerMemory.findMany({
    where: { userId },
    orderBy: [{ verified: "asc" }, { updatedAt: "desc" }],
    select: { id: true, kind: true, content: true, source: true, verified: true, updatedAt: true },
  });
}

export type MemoryResult = { ok: true } | { ok: false; reason: "limit" | "not_found" | "duplicate" };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

async function isDuplicate(userId: string, content: string, exceptId?: string) {
  const rows = await prisma.learnerMemory.findMany({ where: { userId }, select: { id: true, content: true } });
  return rows.some((r) => r.id !== exceptId && norm(r.content) === norm(content));
}

/** A memory the learner writes is confirmed by definition. */
export async function addMemory(userId: string, kind: MemoryKindName, content: string): Promise<MemoryResult> {
  if ((await prisma.learnerMemory.count({ where: { userId } })) >= MAX_MEMORIES) return { ok: false, reason: "limit" };
  if (await isDuplicate(userId, content)) return { ok: false, reason: "duplicate" };
  await prisma.learnerMemory.create({ data: { userId, kind, content, source: "learner", verified: true } });
  return { ok: true };
}

/** Editing a memory makes it the learner's own statement, so it becomes confirmed. */
export async function updateMemory(
  userId: string,
  id: string,
  data: { kind: MemoryKindName; content: string },
): Promise<MemoryResult> {
  if (await isDuplicate(userId, data.content, id)) return { ok: false, reason: "duplicate" };
  const { count } = await prisma.learnerMemory.updateMany({
    where: { id, userId },
    data: { ...data, verified: true },
  });
  return count === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function confirmMemory(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.learnerMemory.updateMany({ where: { id, userId }, data: { verified: true } });
  return count === 1;
}

export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.learnerMemory.deleteMany({ where: { id, userId } });
  return count === 1;
}

/** Store AI suggestions as unverified; skips duplicates and respects the limit. Returns how many were added. */
export async function addSuggestedMemories(
  userId: string,
  items: { kind: MemoryKindName; content: string }[],
): Promise<number> {
  const existing = await prisma.learnerMemory.findMany({ where: { userId }, select: { content: true } });
  const seen = new Set(existing.map((r) => norm(r.content)));
  let room = MAX_MEMORIES - existing.length;
  let added = 0;
  for (const item of items) {
    const content = item.content.trim().slice(0, MAX_MEMORY_LENGTH);
    if (room <= 0 || !content || seen.has(norm(content))) continue;
    seen.add(norm(content));
    await prisma.learnerMemory.create({ data: { userId, kind: item.kind, content, source: "ai", verified: false } });
    room -= 1;
    added += 1;
  }
  return added;
}
