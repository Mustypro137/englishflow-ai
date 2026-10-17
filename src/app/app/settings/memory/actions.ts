"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/app/app/actions";
import { requireUser } from "@/server/auth/session";
import {
  addMemory,
  confirmMemory,
  deleteMemory,
  MAX_MEMORIES,
  MAX_MEMORY_LENGTH,
  MEMORY_KINDS,
  type MemoryResult,
  updateMemory,
} from "@/server/db/memory";

const memoryInput = z.object({
  kind: z.enum(MEMORY_KINDS, { error: "Choose what kind of note this is." }),
  content: z
    .string()
    .trim()
    .min(3, "Write at least a few words.")
    .max(MAX_MEMORY_LENGTH, `Keep it under ${MAX_MEMORY_LENGTH} characters.`),
});
const id = z.string().min(1).max(64);

const FAILURE: Record<Exclude<MemoryResult, { ok: true }>["reason"], string> = {
  limit: `You can keep up to ${MAX_MEMORIES} notes. Delete one first.`,
  duplicate: "You already have this note.",
  not_found: "That note no longer exists.",
};

function fromResult(result: MemoryResult, success: string): FormState {
  if (!result.ok) return { status: "error", message: FAILURE[result.reason] };
  revalidatePath("/app/settings/memory");
  return { status: "success", message: success, savedAt: Date.now() };
}

function parse(formData: FormData) {
  return memoryInput.safeParse({ kind: formData.get("kind"), content: formData.get("content") });
}

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

export async function addMemoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: "Please check the note.", errors: errorsOf(parsed.error) };
  return fromResult(await addMemory(user.id, parsed.data.kind, parsed.data.content), "Note saved.");
}

export async function updateMemoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const memoryId = id.safeParse(formData.get("id"));
  const parsed = parse(formData);
  if (!memoryId.success) return { status: "error", message: FAILURE.not_found };
  if (!parsed.success) return { status: "error", message: "Please check the note.", errors: errorsOf(parsed.error) };
  return fromResult(await updateMemory(user.id, memoryId.data, parsed.data), "Note updated.");
}

export async function confirmMemoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const memoryId = id.safeParse(formData.get("id"));
  if (memoryId.success) await confirmMemory(user.id, memoryId.data);
  revalidatePath("/app/settings/memory");
}

export async function deleteMemoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const memoryId = id.safeParse(formData.get("id"));
  if (memoryId.success) await deleteMemory(user.id, memoryId.data);
  revalidatePath("/app/settings/memory");
}
