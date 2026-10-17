"use server";

import { z } from "zod";
import type { GradeResult } from "@/lib/learning/grading/grade-exercise";
import { requireUser } from "@/server/auth/session";
import { recordGeneratedAttempt } from "@/server/db/generated";
import {
  InvalidResponseError,
  type LessonProgressSummary,
  recordAttempt,
  recordLessonView,
} from "@/server/db/learning-records";

const attemptInput = z.object({
  exerciseId: z.string().min(1).max(64),
  response: z.unknown(),
  hintsUsed: z.number().int().min(0).max(10),
  revealedAnswer: z.boolean(),
  context: z.enum(["lesson", "practice", "generated"]).default("lesson"),
});

export type AttemptActionResult =
  { ok: true; result: GradeResult; progress: LessonProgressSummary | null } | { ok: false; error: string };

/** Grade an answer on the server and save it to the signed-in learner's records. */
export async function submitAttemptAction(input: z.input<typeof attemptInput>): Promise<AttemptActionResult> {
  const user = await requireUser();
  const parsed = attemptInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That answer couldn't be read. Please try again." };
  try {
    const { context, ...attempt } = parsed.data;
    if (context === "generated") {
      return { ok: true, result: await recordGeneratedAttempt(user.id, attempt), progress: null };
    }
    const { result, progress } = await recordAttempt(user.id, { ...attempt, response: attempt.response }, context);
    return { ok: true, result, progress };
  } catch (err) {
    if (err instanceof InvalidResponseError) {
      return { ok: false, error: "Please complete every part of the answer before checking." };
    }
    console.error("[attempt] Failed to save attempt:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Your answer couldn't be saved. Check your connection and try again." };
  }
}

/** Record that the learner opened a lesson (exposure only). */
export async function recordLessonViewAction(lessonSlug: string): Promise<void> {
  const user = await requireUser();
  const slug = z.string().min(1).max(100).safeParse(lessonSlug);
  if (!slug.success) return;
  await recordLessonView(user.id, slug.data);
}
