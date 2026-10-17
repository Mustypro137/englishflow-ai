import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { listeningClips } from "../src/lib/audio/clips";
import { clipHash } from "../src/lib/audio/manifest";
import { findListening } from "../src/lib/labs/content";

/*
 * Audio fixture for the browser tests: a manifest giving one listening item real audio
 * files, served by intercepting requests to a fake origin with a short generated tone.
 * Only the second test server ("lab server") is pointed at this manifest.
 */

export const FIXTURE_ORIGIN = "https://audio.fixture.test";
export const FIXTURE_ITEM = "a1-at-the-cafe";
export const FIXTURE_MANIFEST = resolve("e2e/.generated/audio-manifest.json");

/** Write the fixture manifest from the current content (so it never goes stale). */
export function writeFixtureManifest(): void {
  const item = findListening(FIXTURE_ITEM);
  if (!item) throw new Error(`Fixture listening item ${FIXTURE_ITEM} not found`);
  const clips = Object.fromEntries(
    listeningClips(item).map((s, i) => [
      s.key,
      { url: `${FIXTURE_ORIGIN}/clip-${i}.wav`, hash: clipHash(s.text, s.voice) },
    ]),
  );
  mkdirSync(dirname(FIXTURE_MANIFEST), { recursive: true });
  writeFileSync(FIXTURE_MANIFEST, JSON.stringify({ generator: "e2e-fixture", clips }, null, 2));
}

/** A short 16-bit mono WAV tone. */
export function toneWav(seconds = 0.4, hz = 440, rate = 8000): Buffer {
  const samples = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 8000), 44 + i * 2);
  }
  return buf;
}

/** Serve the fixture audio files to this page; returns the list of files requested. */
export async function serveFixtureAudio(page: Page): Promise<string[]> {
  const requested: string[] = [];
  const body = toneWav();
  await page.route(`${FIXTURE_ORIGIN}/**`, (route) => {
    requested.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 200, contentType: "audio/wav", body, headers: { "accept-ranges": "none" } });
  });
  return requested;
}

/** Make the page behave like a browser without speech voices (deterministic tests). */
export async function withoutDeviceSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
  });
}
