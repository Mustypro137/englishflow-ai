import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

// Trim and lower-case first, then validate, so a pasted address with stray spaces is accepted.
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

export const nameSchema = z.string().trim().min(1, "Enter your name.").max(60, "Use at most 60 characters.");

export const signUpSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

/** Only allow redirects to paths inside the learner app (prevents open redirects). */
export function safeAppRedirect(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/app") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
