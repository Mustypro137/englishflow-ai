"use server";

import { sentenceContaining } from "@content/labs/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findReading } from "@/lib/labs/content";
import { requireUser } from "@/server/auth/session";
import { type CompletedActivity, completeLabActivity } from "@/server/db/labs";
import { type GlossarySaveResult, saveGlossaryWord } from "@/server/db/vocabulary";

const slug = z.string().min(1).max(100);

/** Save a glossary word with the sentence it appears in. Everything comes from the content, not the browser. */
export async function saveReadingWordAction(textSlug: string, word: string): Promise<GlossarySaveResult> {
  const user = await requireUser();
  const text = slug.safeParse(textSlug).success ? findReading(textSlug) : null;
  const item = text?.glossary.find((g) => g.word === word);
  if (!text || !item) return { saved: false };
  const sentence = sentenceContaining(text.paragraphs, item.word) ?? item.word;
  const result = await saveGlossaryWord(user.id, {
    word: item.word,
    definition: item.definition,
    entrySlug: item.entry ?? null,
    sentence,
    title: text.title,
  });
  revalidatePath("/app", "layout");
  return result;
}

export type CompleteReadingResult = { ok: true; result: CompletedActivity } | { ok: false; error: string };

export async function completeReadingAction(textSlug: string): Promise<CompleteReadingResult> {
  const user = await requireUser();
  const text = slug.safeParse(textSlug).success ? findReading(textSlug) : null;
  if (!text) return { ok: false, error: "This text couldn't be saved. Please try again." };
  try {
    const result = await completeLabActivity(user.id, {
      skill: "reading",
      itemSlug: text.slug,
      mode: "text",
      questionSlugs: text.questions.map((q) => q.exercise.slug),
    });
    revalidatePath("/app/reading");
    return { ok: true, result };
  } catch (err) {
    console.error("[reading] Failed to save:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Your result couldn't be saved. Check your connection and try again." };
  }
}
