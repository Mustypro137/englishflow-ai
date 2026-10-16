"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { requireUser } from "@/server/auth/session";
import { MAX_CHALLENGE_TEXT, submitChallengeWriting } from "@/server/db/challenges";

const writingSchema = z.object({
  challengeSlug: z.string().min(1).max(64),
  text: z
    .string()
    .trim()
    .min(1, "Write your sentences first.")
    .max(MAX_CHALLENGE_TEXT, `Keep it under ${MAX_CHALLENGE_TEXT} characters.`),
});

export async function submitWritingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = writingSchema.safeParse({ challengeSlug: formData.get("challengeSlug"), text: formData.get("text") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message,
      errors: { text: parsed.error.issues[0]?.message ?? "" },
    };
  }
  const outcome = await submitChallengeWriting(user.id, parsed.data.challengeSlug, parsed.data.text);
  if (!outcome.ok) return { status: "error", message: outcome.error };
  revalidatePath("/app", "layout");
  if (outcome.completed) {
    return {
      status: "success",
      message: `Saved — ${outcome.sentences} sentences. Challenge complete.`,
      savedAt: Date.now(),
    };
  }
  return {
    status: "success",
    message: `Saved. ${outcome.sentences} of ${outcome.target} sentences count so far (each needs at least three words).`,
    savedAt: Date.now(),
  };
}
