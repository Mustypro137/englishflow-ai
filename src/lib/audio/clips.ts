/**
 * Where every piece of audio is used, as clip specs (stable key + words + voice).
 * The generation script uses this list; pages use it to look up files.
 */
import type { ValidatedLabs } from "@content/validate";
import type { PlacementItem, Voice } from "@content/schemas";
import type { ClipSpec } from "./manifest";

type ListeningItem = ValidatedLabs["listeningItems"][number];
type Scenario = ValidatedLabs["scenarios"][number];

export function listeningClips(item: ListeningItem): ClipSpec[] {
  const voices = new Map(item.speakers.map((s) => [s.id, s.voice]));
  return item.lines.map((l, i) => ({
    key: `listening/${item.slug}/${i}`,
    text: l.text,
    voice: voices.get(l.speaker)!,
  }));
}

export function placementClips(slug: string, lines: readonly { voice: Voice; text: string }[]): ClipSpec[] {
  return lines.map((l, i) => ({ key: `placement/${slug}/${i}`, text: l.text, voice: l.voice }));
}

/** Single words and sentences in the pronunciation lab use one consistent model voice. */
export const PRONUNCIATION_VOICE: Voice = "female";

export function wordClip(word: string): ClipSpec {
  return { key: `word/${word.toLowerCase()}`, text: word, voice: PRONUNCIATION_VOICE };
}

export function sentenceClip(setSlug: string, index: number, text: string): ClipSpec {
  return { key: `pronunciation/${setSlug}/${index}`, text, voice: PRONUNCIATION_VOICE };
}

export function scenarioClips(s: Scenario): ClipSpec[] {
  const learnerVoice: Voice = s.partnerVoice === "female" ? "male" : "female";
  return s.modelDialogue.map((l, i) => ({
    key: `scenario/${s.slug}/${i}`,
    text: l.text,
    voice: l.speaker === "partner" ? s.partnerVoice : learnerVoice,
  }));
}

/** Every clip the content needs, de-duplicated by key. */
export function allClipSpecs(labs: ValidatedLabs, placement: readonly PlacementItem[]): ClipSpec[] {
  const specs: ClipSpec[] = [
    ...labs.listeningItems.flatMap(listeningClips),
    ...placement.flatMap((p) =>
      p.exercise.type === "multiple_choice" && p.exercise.payload.listen
        ? placementClips(p.exercise.slug, p.exercise.payload.listen)
        : [],
    ),
    ...labs.pronunciation.minimalPairs.flatMap((set) => [
      ...set.pairs.flat().map(wordClip),
      ...set.sentences.map((t, i) => sentenceClip(set.slug, i, t)),
    ]),
    ...labs.pronunciation.stress.flatMap((set) => set.items.map((i) => wordClip(i.word))),
    ...labs.pronunciation.intonation.flatMap((set) => set.items.map((i, n) => sentenceClip(set.slug, n, i.sentence))),
    ...labs.scenarios.flatMap(scenarioClips),
  ];
  const byKey = new Map<string, ClipSpec>();
  for (const s of specs) if (!byKey.has(s.key)) byKey.set(s.key, s);
  return [...byKey.values()];
}
