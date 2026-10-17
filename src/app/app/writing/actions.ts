"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { findSentencePrompt, findWritingTask } from "@/lib/labs/content";
import { requestWritingFeedback } from "@/server/ai/writing";
import type { StoredFeedback } from "@/server/ai/writing-feedback";
import { requireUser } from "@/server/auth/session";
import { createDraft, deleteDraft, MAX_WRITING_LENGTH } from "@/server/db/writing";

const draftInput = z.object({
  kind: z.enum(["task", "journal", "sentence"]),
  taskSlug: z.string().max(100).nullable(),
  title: z.string().trim().max(100).nullable(),
  text: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(MAX_WRITING_LENGTH, `Use at most ${MAX_WRITING_LENGTH} characters.`),
  parentId: z.string().max(64).nullable(),
});

export type DraftActionResult = { ok: false; error: string };

/** Save a draft (or a rewrite of one) and open it. */
export async function createDraftAction(input: z.input<typeof draftInput>): Promise<DraftActionResult> {
  const user = await requireUser();
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your text." };
  const data = parsed.data;
  if (data.kind === "task" && !(data.taskSlug && findWritingTask(data.taskSlug)))
    return { ok: false, error: "This task doesn't exist." };
  if (data.kind === "sentence" && !(data.taskSlug && findSentencePrompt(data.taskSlug)))
    return { ok: false, error: "This prompt doesn't exist." };
  const result = await createDraft(user.id, {
    ...data,
    taskSlug: data.kind === "journal" ? null : data.taskSlug,
    title: data.title || null,
  });
  if (!result.ok)
    return {
      ok: false,
      error:
        result.reason === "limit"
          ? "You've saved the maximum number of drafts. Delete some old ones to save new writing."
          : "The draft you're rewriting wasn't found.",
    };
  revalidatePath("/app/writing");
  redirect(`/app/writing/${result.id}`);
}

export type FeedbackActionResult = { ok: true; feedback: StoredFeedback } | { ok: false; error: string };

export async function requestFeedbackAction(draftId: string, style: boolean): Promise<FeedbackActionResult> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).safeParse(draftId);
  if (!id.success) return { ok: false, error: "This draft wasn't found." };
  try {
    const { feedback } = await requestWritingFeedback(user.id, id.data, { style: style === true });
    revalidatePath(`/app/writing/${id.data}`);
    return { ok: true, feedback };
  } catch (err) {
    if (err instanceof AiError)
      return {
        ok: false,
        error: err.kind === "bad_request" ? "This draft wasn't found." : err.userMessage,
      };
    console.error("[writing] feedback failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Feedback isn't available right now. Your writing is saved." };
  }
}

export async function deleteDraftAction(draftId: string): Promise<void> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).parse(draftId);
  await deleteDraft(user.id, id);
  revalidatePath("/app/writing");
  redirect("/app/writing");
}
