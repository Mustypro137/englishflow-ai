"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createNote } from "@/server/db/notebook";

const sentence = z.string().trim().min(1).max(1000);

/** Save a sentence the learner built to their notebook. */
export async function saveSentenceNoteAction(text: string): Promise<boolean> {
  const user = await requireUser();
  const parsed = sentence.safeParse(text);
  if (!parsed.success) return false;
  await createNote(user.id, { kind: "saved_sentence", body: parsed.data, lessonSlug: null });
  revalidatePath("/app/notebook");
  return true;
}
