import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { buildSessionPlan, type SessionPlan } from "@/lib/learning/planner";
import { recommend } from "@/lib/learning/recommend/engine";
import { getLearnerSnapshot } from "./activity";
import { prisma } from "./client";

/*
 * Study sessions: a plan for the chosen length, and which blocks the learner has
 * marked done. Every query is scoped to the signed-in learner's userId.
 */

export interface SessionView {
  id: string;
  plannedMinutes: number;
  plan: SessionPlan;
  completedBlocks: string[];
  startedAt: Date;
  completedAt: Date | null;
}

const ACTIVE_FOR_MS = 12 * 3_600_000;

function toView(row: {
  id: string;
  plannedMinutes: number;
  plan: Prisma.JsonValue;
  completedBlocks: string[];
  startedAt: Date;
  completedAt: Date | null;
}): SessionView {
  return { ...row, plan: row.plan as unknown as SessionPlan };
}

/** A plan without saving it, for the "preview" before starting. */
export async function previewSession(userId: string, minutes: number, now = new Date()): Promise<SessionPlan> {
  const snapshot = await getLearnerSnapshot(userId, now);
  return buildSessionPlan(minutes, snapshot, recommend(snapshot));
}

/** Start a session: the plan is built on the server from the learner's own records and saved as shown. */
export async function startSession(userId: string, minutes: number, now = new Date()): Promise<SessionView> {
  const plan = await previewSession(userId, minutes, now);
  const row = await prisma.studySession.create({
    data: {
      userId,
      plannedMinutes: plan.minutes,
      plan: plan as unknown as Prisma.InputJsonValue,
      completedBlocks: [],
      startedAt: now,
    },
  });
  return toView(row);
}

/** The learner's latest session from the last 12 hours (finished or not), if any. */
export async function getCurrentSession(userId: string, now = new Date()): Promise<SessionView | null> {
  const row = await prisma.studySession.findFirst({
    where: { userId, startedAt: { gte: new Date(now.getTime() - ACTIVE_FOR_MS) } },
    orderBy: { startedAt: "desc" },
  });
  return row ? toView(row) : null;
}

/**
 * Mark a block done or not done. When every block is done the session is completed.
 * Returns null if the session isn't the learner's or the block doesn't exist.
 */
export async function setBlockDone(
  userId: string,
  sessionId: string,
  blockId: string,
  done: boolean,
  now = new Date(),
): Promise<SessionView | null> {
  const row = await prisma.studySession.findFirst({ where: { id: sessionId, userId } });
  if (!row) return null;
  const view = toView(row);
  if (!view.plan.blocks.some((b) => b.id === blockId)) return null;
  const set = new Set(view.completedBlocks);
  if (done) set.add(blockId);
  else set.delete(blockId);
  const completedBlocks = view.plan.blocks.map((b) => b.id).filter((id) => set.has(id));
  const allDone = completedBlocks.length === view.plan.blocks.length;
  const updated = await prisma.studySession.update({
    where: { id: row.id },
    data: { completedBlocks, completedAt: allDone ? (row.completedAt ?? now) : null },
  });
  return toView(updated);
}

/** End a session early (it stays in the calendar with the blocks that were done). */
export async function endSession(userId: string, sessionId: string, now = new Date()): Promise<boolean> {
  const { count } = await prisma.studySession.updateMany({
    where: { id: sessionId, userId, completedAt: null },
    data: { completedAt: now },
  });
  return count === 1;
}
