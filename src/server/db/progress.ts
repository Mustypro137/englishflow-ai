import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ConceptProgressCounts } from "@/lib/learning/mastery";

type Tx = Prisma.TransactionClient;

/** Load concept progress rows for one learner, keyed by concept id. */
export async function loadProgressMap(
  tx: Tx,
  userId: string,
  conceptIds: string[],
): Promise<Map<string, ConceptProgressCounts>> {
  if (conceptIds.length === 0) return new Map();
  const rows = await tx.conceptProgress.findMany({ where: { userId, conceptId: { in: conceptIds } } });
  return new Map(rows.map((row) => [row.conceptId, row]));
}

export async function saveProgress(tx: Tx, userId: string, conceptId: string, p: ConceptProgressCounts) {
  const data = {
    exposures: p.exposures,
    attempts: p.attempts,
    correct: p.correct,
    independentCorrect: p.independentCorrect,
    recentOutcomes: p.recentOutcomes,
    masteryState: p.masteryState,
    lastExposedAt: p.lastExposedAt,
    lastPracticedAt: p.lastPracticedAt,
    reviewCorrectDays: p.reviewCorrectDays,
    lastReviewCorrectDay: p.lastReviewCorrectDay,
    masteredAt: p.masteredAt,
  };
  await tx.conceptProgress.upsert({
    where: { userId_conceptId: { userId, conceptId } },
    create: { userId, conceptId, ...data },
    update: data,
  });
}
