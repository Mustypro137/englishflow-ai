"use server";

import { CEFR_CODES } from "@content/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PlacementEstimate } from "@/lib/learning/placement";
import { requireUser } from "@/server/auth/session";
import { chooseStartingLevel, InvalidResponseError, submitPlacement } from "@/server/db/learning-records";

const answersSchema = z
  .array(z.object({ exerciseId: z.string().min(1).max(64), optionId: z.string().max(50).nullable() }))
  .min(1)
  .max(100);

export type PlacementActionResult =
  { ok: true; resultId: string; estimate: PlacementEstimate } | { ok: false; error: string };

export async function submitPlacementAction(answers: z.input<typeof answersSchema>): Promise<PlacementActionResult> {
  const user = await requireUser();
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Please answer at least one question before finishing." };
  try {
    const { resultId, estimate } = await submitPlacement(user.id, parsed.data);
    return { ok: true, resultId, estimate };
  } catch (err) {
    if (err instanceof InvalidResponseError)
      return { ok: false, error: "Your answers couldn't be read. Please try again." };
    console.error("[placement] Failed to save:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Your result couldn't be saved. Check your connection and try again." };
  }
}

const chooseSchema = z.object({ resultId: z.string().max(64).nullable(), level: z.enum(CEFR_CODES) });

export async function chooseLevelAction(input: z.input<typeof chooseSchema>): Promise<{ ok: false; error: string }> {
  const user = await requireUser();
  const parsed = chooseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a level." };
  await chooseStartingLevel(user.id, parsed.data.resultId, parsed.data.level);
  revalidatePath("/app", "layout");
  redirect("/app");
}
