import "server-only";
import { activeChallenges, challengePeriods, countSentences } from "@/lib/learning/challenges";
import { prisma } from "./client";

/*
 * Challenge submissions. Completion of activity-based challenges is recorded by
 * getChallenges()/getDashboard() in ./activity; this module handles writing.
 * Every query is scoped to the signed-in learner's userId.
 */

export const MAX_CHALLENGE_TEXT = 2000;

export type WritingOutcome =
  { ok: true; sentences: number; target: number; completed: boolean } | { ok: false; error: string };

/** Save the learner's writing for an active writing challenge. Completion needs enough real sentences. */
export async function submitChallengeWriting(
  userId: string,
  challengeSlug: string,
  text: string,
  now = new Date(),
): Promise<WritingOutcome> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
  const periods = challengePeriods(now, profile?.timezone ?? "UTC");
  const active = activeChallenges(periods).find((a) => a.challenge.slug === challengeSlug);
  if (!active || active.challenge.metric !== "original_sentences") {
    return { ok: false, error: "This challenge isn't open right now." };
  }
  const trimmed = text.trim().slice(0, MAX_CHALLENGE_TEXT);
  const sentences = countSentences(trimmed);
  const completed = sentences >= active.challenge.target;
  const key = { userId_challengeSlug_periodKey: { userId, challengeSlug, periodKey: active.periodKey } };
  const existing = await prisma.challengeSubmission.findUnique({ where: key, select: { completedAt: true } });
  await prisma.challengeSubmission.upsert({
    where: key,
    create: {
      userId,
      challengeSlug,
      periodKey: active.periodKey,
      text: trimmed,
      completedAt: completed ? now : null,
    },
    // A completion, once earned, stays recorded.
    update: { text: trimmed, completedAt: existing?.completedAt ?? (completed ? now : null) },
  });
  return { ok: true, sentences, target: active.challenge.target, completed: completed || !!existing?.completedAt };
}
