"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/app/actions";
import { fieldErrors } from "@/lib/validation/profile";
import { flashcardSchema, idSchema, noteSchema } from "@/lib/validation/notebook";
import { requireUser } from "@/server/auth/session";
import { deleteMistake } from "@/server/db/mistakes";
import {
  createFlashcard,
  createNote,
  deleteFlashcard,
  deleteNote,
  toggleBookmark,
  updateFlashcard,
  updateNote,
} from "@/server/db/notebook";
import { removeSavedWord, saveWord } from "@/server/db/vocabulary";

function formObject(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$")));
}

export async function saveFlashcardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formObject(formData);
  const parsed = flashcardSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "Please check the card.", errors: fieldErrors(parsed.error) };
  const id = typeof values.id === "string" && values.id ? idSchema.parse(values.id) : null;
  if (id) {
    if (!(await updateFlashcard(user.id, id, parsed.data))) return { status: "error", message: "Card not found." };
  } else {
    await createFlashcard(user.id, parsed.data);
  }
  revalidatePath("/app", "layout");
  return {
    status: "success",
    message: id ? "Card updated." : "Card added. It's ready to review now.",
    savedAt: Date.now(),
  };
}

export async function deleteFlashcardAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteFlashcard(user.id, idSchema.parse(id));
  revalidatePath("/app", "layout");
}

export async function saveNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formObject(formData);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "Please check the note.", errors: fieldErrors(parsed.error) };
  const id = typeof values.id === "string" && values.id ? idSchema.parse(values.id) : null;
  if (id) {
    if (!(await updateNote(user.id, id, parsed.data))) return { status: "error", message: "Note not found." };
  } else {
    await createNote(user.id, parsed.data);
  }
  revalidatePath("/app", "layout");
  return { status: "success", message: id ? "Note updated." : "Note saved.", savedAt: Date.now() };
}

export async function deleteNoteAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteNote(user.id, idSchema.parse(id));
  revalidatePath("/app", "layout");
}

export async function toggleBookmarkAction(lessonSlug: string): Promise<boolean> {
  const user = await requireUser();
  const result = await toggleBookmark(user.id, idSchema.parse(lessonSlug));
  revalidatePath("/app", "layout");
  return result;
}

export async function toggleSavedWordAction(entryId: string, save: boolean): Promise<boolean> {
  const user = await requireUser();
  const id = idSchema.parse(entryId);
  if (save) await saveWord(user.id, id);
  else await removeSavedWord(user.id, id);
  revalidatePath("/app", "layout");
  return save;
}

export async function deleteMistakeAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteMistake(user.id, idSchema.parse(id));
  revalidatePath("/app", "layout");
}
