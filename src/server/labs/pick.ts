import "server-only";
import type { Cefr } from "@content/schemas";
import { byClosestLevel, labContent } from "@/lib/labs/content";
import { pickSkillActivity, type SkillPick } from "@/lib/labs/pick";
import { getLabHistory } from "@/server/db/labs";

const WEEK = 7 * 86_400_000;

/** Today's listening or reading activity for the study plan, from the learner's own history. */
export async function pickSkillPractice(
  userId: string,
  level: Cefr | null,
  now = new Date(),
): Promise<SkillPick | null> {
  const [listening, reading] = await Promise.all([
    getLabHistory(userId, "listening"),
    getLabHistory(userId, "reading"),
  ]);
  const since = now.getTime() - WEEK;
  const recent = (h: typeof listening) => [...h.values()].filter((e) => e.lastCompletedAt.getTime() >= since).length;
  const lastDone = (h: typeof listening) => new Map([...h].map(([slug, e]) => [slug, e.lastCompletedAt]));
  const { listeningItems, readingTexts } = labContent();
  return pickSkillActivity({
    listening: byClosestLevel(listeningItems, level).map((i) => ({
      slug: i.slug,
      title: i.title,
      minutes: i.estimatedMinutes,
    })),
    reading: byClosestLevel(readingTexts, level).map((t) => ({
      slug: t.slug,
      title: t.title,
      minutes: t.estimatedMinutes,
    })),
    lastDone: { listening: lastDone(listening), reading: lastDone(reading) },
    doneThisWeek: { listening: recent(listening), reading: recent(reading) },
  });
}
