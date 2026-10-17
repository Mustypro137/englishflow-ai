/**
 * Generate computer-voice audio for skill-lab content and upload it to object storage.
 *
 *   npm run audio:plan        # what would be generated, and how many characters (no cost)
 *   npm run audio:generate    # generate missing/changed clips, upload, update the manifest
 *
 * Needs (only for generating): TTS_PROVIDER=openai, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN.
 * Optional: TTS_MODEL, TTS_VOICE_FEMALE, TTS_VOICE_MALE, TTS_CONCURRENCY.
 *
 * Files are named by a hash of their words and voice, so identical clips are generated
 * once and an edited sentence gets a new file. The manifest (content/audio/manifest.json)
 * is committed; the site only plays a file while its hash matches the current content.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { put } from "@vercel/blob";
import { config } from "dotenv";
import { validateContent } from "../content/validate";
import { allClipSpecs } from "../src/lib/audio/clips";
import {
  type AudioManifest,
  type ClipSpec,
  clipHash,
  duplicateKeys,
  EMPTY_MANIFEST,
  manifestSchema,
  planGeneration,
  type Voice,
} from "../src/lib/audio/manifest";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const MANIFEST_PATH = "content/audio/manifest.json";
const args = new Set(process.argv.slice(2));
const generate = args.has("--generate");
const prune = args.has("--prune");

interface TtsProvider {
  label: string;
  synthesize(text: string, voice: Voice): Promise<Uint8Array>;
}

function openAiProvider(): TtsProvider {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("Set OPENAI_API_KEY to generate audio with TTS_PROVIDER=openai.");
  const model = process.env.TTS_MODEL?.trim() || "gpt-4o-mini-tts";
  const voices: Record<Voice, string> = {
    female: process.env.TTS_VOICE_FEMALE?.trim() || "nova",
    male: process.env.TTS_VOICE_MALE?.trim() || "onyx",
  };
  return {
    label: `openai:${model}`,
    async synthesize(text, voice) {
      for (let attempt = 1; ; attempt++) {
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            model,
            voice: voices[voice],
            input: text,
            response_format: "mp3",
            ...(model.startsWith("gpt-4o")
              ? { instructions: "Speak clearly and naturally at a calm pace, for English learners." }
              : {}),
          }),
        });
        if (res.ok) return new Uint8Array(await res.arrayBuffer());
        if (attempt >= 3 || (res.status < 500 && res.status !== 429)) {
          throw new Error(`TTS request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    },
  };
}

function provider(): TtsProvider {
  const name = process.env.TTS_PROVIDER?.trim().toLowerCase();
  if (name === "openai") return openAiProvider();
  throw new Error("Set TTS_PROVIDER (supported: openai). See .env.example.");
}

function readManifest(): AudioManifest {
  try {
    return manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, "utf8")));
  } catch {
    return EMPTY_MANIFEST;
  }
}

async function main() {
  const content = validateContent();
  const specs = allClipSpecs(content.labs, content.placement);
  const dupes = duplicateKeys(specs);
  if (dupes.length) throw new Error(`Duplicate clip keys: ${dupes.join(", ")}`);
  const manifest = readManifest();
  const plan = planGeneration(specs, manifest);
  const todo = [...plan.missing, ...plan.stale];
  const unique = new Map<string, ClipSpec[]>();
  for (const s of todo) {
    const h = clipHash(s.text, s.voice);
    unique.set(h, [...(unique.get(h) ?? []), s]);
  }
  const characters = [...unique.values()].reduce((sum, group) => sum + group[0].text.length, 0);

  console.log(`Clips in content: ${specs.length}`);
  console.log(`  up to date: ${plan.upToDate} · missing: ${plan.missing.length} · changed: ${plan.stale.length}`);
  console.log(`  unique files to generate: ${unique.size} (${characters} characters)`);
  if (plan.unused.length)
    console.log(
      `  no longer used: ${plan.unused.length}${prune ? " (will be removed)" : " (run with --prune to remove)"}`,
    );

  if (!generate) {
    console.log("\nPreview only. Run `npm run audio:generate` to create and upload the files.");
    return;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("Set BLOB_READ_WRITE_TOKEN to upload audio to Vercel Blob.");
  const tts = provider();
  const next: AudioManifest = { generator: tts.label, clips: { ...manifest.clips } };
  if (prune) for (const key of plan.unused) delete next.clips[key];

  const groups = [...unique.entries()];
  const concurrency = Math.max(1, Math.min(6, Number(process.env.TTS_CONCURRENCY) || 3));
  let done = 0;
  let failed = 0;
  async function worker() {
    for (;;) {
      const item = groups.shift();
      if (!item) return;
      const [hash, group] = item;
      try {
        const audio = await tts.synthesize(group[0].text, group[0].voice);
        const blob = await put(`audio/${hash}.mp3`, Buffer.from(audio), {
          access: "public",
          contentType: "audio/mpeg",
          addRandomSuffix: false,
          allowOverwrite: true,
          token,
        });
        for (const s of group) next.clips[s.key] = { url: blob.url, hash };
        done++;
        if (done % 10 === 0) console.log(`  ${done}/${unique.size} generated`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${group[0].key}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  // Keys sorted so the committed file diffs cleanly.
  const sorted = Object.fromEntries(Object.entries(next.clips).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify({ generator: next.generator, clips: sorted }, null, 2)}\n`);
  console.log(
    `\nGenerated ${done} files${failed ? `, ${failed} failed (run again to retry)` : ""}. Manifest updated: ${MANIFEST_PATH}`,
  );
  console.log("Commit the manifest and deploy for the site to use the new audio.");
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
