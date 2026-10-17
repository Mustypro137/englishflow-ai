"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { suggestMemories } from "@/server/ai/memory";
import { requireUser } from "@/server/auth/session";
import { deleteConversation } from "@/server/db/tutor";

const id = z.string().min(1).max(64);

export async function deleteConversationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = id.safeParse(formData.get("conversationId"));
  if (parsed.success) await deleteConversation(user.id, parsed.data);
  revalidatePath("/app/tutor", "layout");
  redirect("/app/tutor");
}

export type SuggestResult = { ok: true; added: number } | { ok: false; error: string };

/** Ask the AI for notes worth remembering from this conversation; they're saved unconfirmed. */
export async function suggestMemoriesAction(conversationId: string): Promise<SuggestResult> {
  const user = await requireUser();
  const parsed = id.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "That conversation couldn't be found." };
  try {
    const added = await suggestMemories(user.id, parsed.data);
    revalidatePath("/app/settings/memory");
    return { ok: true, added };
  } catch (err) {
    if (err instanceof AiError) return { ok: false, error: err.userMessage };
    console.error("[tutor] memory suggestions failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Suggestions couldn't be made right now. Please try again later." };
  }
}
