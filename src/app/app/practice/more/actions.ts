"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { AiError } from "@/lib/ai/errors";
import { generatePractice } from "@/server/ai/generate";
import { requireUser } from "@/server/auth/session";

const conceptSlug = z.string().regex(/^[a-z0-9-]{1,100}$/);

export async function generatePracticeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const slug = conceptSlug.safeParse(formData.get("concept"));
  if (!slug.success) return { status: "error", message: "That topic couldn't be found." };
  try {
    const { stored, rejected } = await generatePractice(user.id, slug.data);
    revalidatePath("/app/practice/more");
    if (stored === 0 && rejected === 0) {
      return { status: "success", message: "You already have new exercises for this topic. Try those first." };
    }
    return {
      status: "success",
      message: `${stored} new ${stored === 1 ? "exercise" : "exercises"} added.${
        rejected > 0 ? ` ${rejected} didn't pass our checks and were thrown away.` : ""
      }`,
      savedAt: Date.now(),
    };
  } catch (err) {
    if (err instanceof AiError) return { status: "error", message: err.userMessage };
    console.error("[generate] failed:", err instanceof Error ? err.message : err);
    return { status: "error", message: "New exercises couldn't be made right now. Please try again later." };
  }
}
