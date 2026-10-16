import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const flashcardSchema = z.object({
  front: z.string().trim().min(1, "Write the front of the card.").max(300, "Use at most 300 characters."),
  back: z.string().trim().min(1, "Write the back of the card.").max(500, "Use at most 500 characters."),
  note: optionalText(500),
});
export type FlashcardInput = z.output<typeof flashcardSchema>;

export const noteSchema = z.object({
  kind: z.enum(["grammar_note", "saved_sentence"], { error: "Choose a note type." }),
  body: z.string().trim().min(1, "Write something first.").max(1000, "Use at most 1000 characters."),
  lessonSlug: optionalText(100),
});
export type NoteInput = z.output<typeof noteSchema>;

export const idSchema = z.string().min(1).max(64);
