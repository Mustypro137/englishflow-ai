"use server";

import { z } from "zod";
import type { GradeResult } from "@/lib/learning/grading/grade-exercise";
import type { Rating } from "@/lib/learning/srs/scheduler";
import { requireUser } from "@/server/auth/session";
import { InvalidResponseError } from "@/server/db/learning-records";
import { answerReview } from "@/server/db/reviews";

const inputSchema = z.object({
  reviewItemId: z.string().min(1).max(64),
  response: z.unknown().optional(),
  rating: z.enum(["again", "hard", "good", "easy"]).optional(),
  helped: z.boolean().optional(),
});

export type ReviewActionResult =
  | {
      ok: true;
      rating: Rating;
      correct: boolean | null;
      result: GradeResult | null;
      answer: string | null;
      nextDueLabel: string;
    }
  | { ok: false; error: string };

export async function answerReviewAction(input: z.input<typeof inputSchema>): Promise<ReviewActionResult> {
  const user = await requireUser();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That answer couldn't be read. Please try again." };
  try {
    const r = await answerReview(user.id, parsed.data);
    return {
      ok: true,
      rating: r.rating,
      correct: r.correct,
      result: r.result,
      answer: r.answer,
      nextDueLabel: r.nextDueLabel,
    };
  } catch (err) {
    if (err instanceof InvalidResponseError) return { ok: false, error: err.message };
    console.error("[review] Failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Your answer couldn't be saved. Check your connection and try again." };
  }
}
