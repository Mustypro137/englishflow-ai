"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors, onboardingSchema, preferencesUpdateSchema, profileUpdateSchema } from "@/lib/validation/profile";
import { requireUser } from "@/server/auth/session";
import { completeOnboarding, updatePreferences, updateProfile } from "@/server/db/learner-profile";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  /** Set on success; lets "create" forms reset themselves by re-mounting. */
  savedAt?: number;
};

/** Read a form into a plain object; repeated fields (checkbox groups) become arrays. */
function formToObject(formData: FormData, arrayFields: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$")) continue; // React internals
    out[key] = arrayFields.includes(key) ? formData.getAll(key) : formData.get(key);
  }
  for (const key of arrayFields) out[key] ??= [];
  return out;
}

export async function completeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(formToObject(formData, ["goals"]));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted answers.", errors: fieldErrors(parsed.error) };
  }
  await completeOnboarding(user.id, parsed.data);
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse(formToObject(formData, ["goals"]));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  }
  await updateProfile(user.id, parsed.data);
  revalidatePath("/app", "layout");
  return { status: "success", message: "Profile saved." };
}

export async function updatePreferencesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = preferencesUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  }
  await updatePreferences(user.id, parsed.data);
  revalidatePath("/app", "layout");
  return { status: "success", message: "Preferences saved." };
}
