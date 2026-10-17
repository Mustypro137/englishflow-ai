"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findListening } from "@/lib/labs/content";
import { requireUser } from "@/server/auth/session";
import { type CompletedActivity, completeLabActivity } from "@/server/db/labs";

const input = z.object({
  slug: z.string().min(1).max(100),
  mode: z.enum(["audio", "text"]),
  plays: z.number().int().min(0).max(1000),
  transcriptEarly: z.boolean(),
  dictation: z.array(z.object({ line: z.number().int().min(0).max(100), typed: z.string().max(500) })).max(10),
});

export type CompleteListeningResult = { ok: true; result: CompletedActivity } | { ok: false; error: string };

/** Save a finished listening item. Scores are worked out on the server from the content. */
export async function completeListeningAction(data: z.input<typeof input>): Promise<CompleteListeningResult> {
  const user = await requireUser();
  const parsed = input.safeParse(data);
  const item = parsed.success ? findListening(parsed.data.slug) : null;
  if (!parsed.success || !item) return { ok: false, error: "This activity couldn't be saved. Please try again." };
  const { mode, plays, transcriptEarly } = parsed.data;
  const dictation = parsed.data.dictation
    .filter((d) => item.dictation.includes(d.line) && d.typed.trim())
    .map((d) => ({ line: d.line, expected: item.lines[d.line].text, typed: d.typed }));
  try {
    const result = await completeLabActivity(user.id, {
      skill: "listening",
      itemSlug: item.slug,
      mode,
      questionSlugs: item.questions.map((q) => q.slug),
      dictation: mode === "audio" ? dictation : [],
      extra: { plays, transcriptEarly },
    });
    revalidatePath("/app/listening");
    return { ok: true, result };
  } catch (err) {
    console.error("[listening] Failed to save:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Your result couldn't be saved. Check your connection and try again." };
  }
}
