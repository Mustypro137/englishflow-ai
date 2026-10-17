import { z } from "zod";

export const MEMORY_KINDS = ["preference", "recurring_error", "goal"] as const;
export type MemoryKindName = (typeof MEMORY_KINDS)[number];
export const MAX_MEMORY_LENGTH = 300;

/** What the model may return when suggesting notes. Validated before anything is stored. */
export const memorySuggestionSchema = z.object({
  memories: z
    .array(z.object({ kind: z.enum(MEMORY_KINDS), content: z.string().trim().min(3).max(MAX_MEMORY_LENGTH) }))
    .max(3),
});
