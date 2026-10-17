/**
 * Pre-generated audio files and the content they were made from. Pure functions.
 *
 * Each clip has a stable key (where it is used) and a hash of the exact words and
 * voice it was generated with. A file is only used while the hash still matches, so
 * editing a sentence never plays outdated audio — it falls back until regenerated.
 */
import { VOICES, type Voice } from "@content/schemas";
import { z } from "zod";

export { VOICES };
export type { Voice };

export interface ClipSpec {
  /** Stable id, e.g. "listening/a1-cafe-order/3". */
  key: string;
  text: string;
  voice: Voice;
}

export const manifestSchema = z.object({
  /** Who generated the files, for the honesty label (e.g. "openai:gpt-4o-mini-tts"). */
  generator: z.string().min(1).nullable(),
  clips: z.record(z.string(), z.object({ url: z.url(), hash: z.string().min(8) })),
});
export type AudioManifest = z.infer<typeof manifestSchema>;

export const EMPTY_MANIFEST: AudioManifest = { generator: null, clips: {} };

/** 64-bit FNV-1a (two 32-bit halves with different offsets), as 16 hex characters. */
export function clipHash(text: string, voice: Voice): string {
  const input = `${voice}|${text.normalize("NFC").replace(/\s+/g, " ").trim()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x050c5d1f;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x01000193) ^ (h1 >>> 7);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

/** The file for this clip, or null when there is none or it was made from different words. */
export function resolveClip(manifest: AudioManifest, spec: ClipSpec): string | null {
  const entry = manifest.clips[spec.key];
  return entry && entry.hash === clipHash(spec.text, spec.voice) ? entry.url : null;
}

export interface GenerationPlan {
  /** Clips with no file yet. */
  missing: ClipSpec[];
  /** Clips whose words or voice changed since their file was made. */
  stale: ClipSpec[];
  upToDate: number;
  /** Manifest keys no longer used by any content. */
  unused: string[];
  /** Characters to send to the TTS provider (providers usually charge per character). */
  characters: number;
}

export function planGeneration(specs: readonly ClipSpec[], manifest: AudioManifest): GenerationPlan {
  const missing: ClipSpec[] = [];
  const stale: ClipSpec[] = [];
  let upToDate = 0;
  for (const spec of specs) {
    const entry = manifest.clips[spec.key];
    if (!entry) missing.push(spec);
    else if (entry.hash !== clipHash(spec.text, spec.voice)) stale.push(spec);
    else upToDate++;
  }
  const used = new Set(specs.map((s) => s.key));
  return {
    missing,
    stale,
    upToDate,
    unused: Object.keys(manifest.clips).filter((k) => !used.has(k)),
    characters: [...missing, ...stale].reduce((sum, s) => sum + s.text.length, 0),
  };
}

/** Duplicate keys would make two different sentences share one file. */
export function duplicateKeys(specs: readonly ClipSpec[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const s of specs) {
    if (seen.has(s.key)) dupes.add(s.key);
    seen.add(s.key);
  }
  return [...dupes];
}
