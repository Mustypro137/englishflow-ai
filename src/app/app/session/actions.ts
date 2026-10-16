"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clampSessionMinutes } from "@/lib/learning/planner";
import { requireUser } from "@/server/auth/session";
import { endSession, setBlockDone, startSession } from "@/server/db/sessions";

const id = z.string().min(1).max(64);

export async function startSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const minutes = clampSessionMinutes(Number(formData.get("minutes")));
  await startSession(user.id, minutes);
  revalidatePath("/app", "layout");
  redirect("/app/session");
}

export async function setBlockDoneAction(sessionId: string, blockId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  const s = id.safeParse(sessionId);
  const b = z.string().min(1).max(32).safeParse(blockId);
  if (!s.success || !b.success) return;
  await setBlockDone(user.id, s.data, b.data, done === true);
  revalidatePath("/app", "layout");
}

export async function endSessionAction(sessionId: string): Promise<void> {
  const user = await requireUser();
  const s = id.safeParse(sessionId);
  if (!s.success) return;
  await endSession(user.id, s.data);
  revalidatePath("/app", "layout");
}
