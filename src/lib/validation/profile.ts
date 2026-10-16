import { z } from "zod";
import { nameSchema } from "./auth";

export const GOALS = [
  { value: "everyday", label: "Everyday conversation" },
  { value: "work", label: "Work and career" },
  { value: "study", label: "Study and exams" },
  { value: "travel", label: "Travel" },
  { value: "reading", label: "Reading and media" },
  { value: "writing", label: "Writing" },
] as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const LEVEL_OPTIONS = [
  { value: "unsure", label: "I'm not sure", hint: "Start from the beginning; a placement check comes soon." },
  { value: "A1", label: "A1 — Beginner", hint: "I know a few words and phrases." },
  { value: "A2", label: "A2 — Elementary", hint: "I can handle simple, routine situations." },
  { value: "B1", label: "B1 — Intermediate", hint: "I can talk about familiar topics and experiences." },
  { value: "B2", label: "B2 — Upper intermediate", hint: "I can discuss many topics with some fluency." },
  { value: "C1", label: "C1 — Advanced", hint: "I use English flexibly for work or study." },
  { value: "C2", label: "C2 — Proficient", hint: "I understand almost everything I hear and read." },
] as const;

export const DAILY_MINUTE_OPTIONS = [10, 20, 30, 60] as const;

export const EXPLANATION_STYLES = [
  { value: "concise", label: "Concise", hint: "Short explanations and key examples." },
  { value: "detailed", label: "Detailed", hint: "Fuller explanations with more examples." },
] as const;

export const TEXT_SCALES = [
  { value: "normal", label: "Standard" },
  { value: "large", label: "Large" },
  { value: "x_large", label: "Extra large" },
] as const;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const timezoneSchema = z.string().trim().min(1).max(64).refine(isValidTimeZone, "Choose a valid time zone.");
const goalsSchema = z
  .array(z.enum(GOALS.map((g) => g.value) as [string, ...string[]]))
  .max(GOALS.length)
  .transform((goals) => [...new Set(goals)]);
const nativeLanguageSchema = z
  .string()
  .trim()
  .max(60, "Use at most 60 characters.")
  .transform((v) => (v === "" ? null : v));
const dailyMinutesSchema = z.coerce
  .number({ error: "Choose how long you want to study each day." })
  .int()
  .min(5, "Choose at least 5 minutes.")
  .max(240, "Choose at most 240 minutes.");

export const onboardingSchema = z.object({
  displayName: nameSchema,
  goals: goalsSchema,
  nativeLanguage: nativeLanguageSchema,
  selfReportedLevel: z.enum(["unsure", ...CEFR_LEVELS], { error: "Choose the option closest to your level." }),
  dailyMinutes: dailyMinutesSchema,
  explanationStyle: z.enum(["concise", "detailed"], { error: "Choose an explanation style." }),
  timezone: timezoneSchema,
});
export type OnboardingInput = z.output<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  displayName: nameSchema,
  goals: goalsSchema,
  nativeLanguage: nativeLanguageSchema,
  timezone: timezoneSchema,
});
export type ProfileUpdateInput = z.output<typeof profileUpdateSchema>;

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const preferencesUpdateSchema = z.object({
  dailyMinutes: dailyMinutesSchema,
  explanationStyle: z.enum(["concise", "detailed"]),
  translationSupport: checkbox,
  textScale: z.enum(["normal", "large", "x_large"]),
  reducedMotion: checkbox,
  gamificationEnabled: checkbox,
});
export type PreferencesUpdateInput = z.output<typeof preferencesUpdateSchema>;

/** Turn Zod issues into { fieldName: firstMessage } for accessible inline errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
