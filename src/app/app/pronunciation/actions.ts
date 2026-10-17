"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findPronunciationSet } from "@/lib/labs/content";
import { requireUser } from "@/server/auth/session";
import { recordPronunciationPractice } from "@/server/db/labs";

const input = z.object({
  setSlug: z.string().min(1).max(100),
  activity: z.enum(["hear", "spelling", "stress", "intonation"]),
  mode: z.enum(["audio", "text"]),
  correct: z.number().int().min(0).max(50),
  total: z.number().int().min(1).max(50),
});

/** Save a finished practice round (a self-check record, not a pronunciation score). */
export async function recordPronunciationAction(data: z.input<typeof input>): Promise<boolean> {
  const user = await requireUser();
  const parsed = input.safeParse(data);
  if (!parsed.success || !findPronunciationSet(parsed.data.setSlug)) return false;
  await recordPronunciationPractice(user.id, parsed.data);
  revalidatePath("/app/pronunciation");
  return true;
}
