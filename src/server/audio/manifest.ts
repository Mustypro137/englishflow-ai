import "server-only";
import { readFileSync } from "node:fs";
import committed from "@content/audio/manifest.json";
import { type AudioManifest, type ClipSpec, EMPTY_MANIFEST, manifestSchema, resolveClip } from "@/lib/audio/manifest";
import type { AudioTrack } from "@/lib/audio/track";

let cached: AudioManifest | null = null;

/**
 * The audio manifest: content/audio/manifest.json, written by scripts/generate-audio.ts.
 * AUDIO_MANIFEST_PATH points at another file (the browser tests use a fixture).
 * An invalid manifest means "no files", never a crash.
 */
export function getAudioManifest(): AudioManifest {
  if (cached) return cached;
  let raw: unknown = committed;
  const path = process.env.AUDIO_MANIFEST_PATH;
  if (path) {
    try {
      raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      console.error("[audio] Couldn't read AUDIO_MANIFEST_PATH:", err instanceof Error ? err.message : err);
      raw = EMPTY_MANIFEST;
    }
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) console.error("[audio] The audio manifest is invalid; no audio files will be used.");
  cached = parsed.success ? parsed.data : EMPTY_MANIFEST;
  return cached;
}

/** Clips with their file, when an up-to-date one exists. */
export function toTracks(specs: readonly ClipSpec[]): AudioTrack[] {
  const manifest = getAudioManifest();
  return specs.map((s) => ({ key: s.key, text: s.text, voice: s.voice, url: resolveClip(manifest, s) }));
}
