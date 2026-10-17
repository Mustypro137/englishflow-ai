import type { Metadata } from "next";
import { DeviceAudioNote } from "@/components/audio/device-audio-note";
import { LabHeader, LabItemCard } from "@/components/labs/lab-parts";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { labContent } from "@/lib/labs/content";
import { getLabHistory } from "@/server/db/labs";
import { requireLearner } from "@/server/labs/guard";

export const metadata: Metadata = { title: "Pronunciation" };

export default async function PronunciationPage() {
  const { user } = await requireLearner();
  const { minimalPairs, stress, intonation } = labContent().pronunciation;
  const history = await getLabHistory(user.id, "pronunciation");
  const done = (slug: string) => {
    const h = history.get(slug);
    return h ? `Practised${h.times > 1 ? ` ${h.times} times` : ""}` : null;
  };
  const groups = [
    {
      id: "sounds",
      title: "Sounds: minimal pairs",
      text: "Pairs of words that differ by one sound, like ship and sheep.",
      sets: minimalPairs.map((s) => ({ slug: s.slug, title: s.title, level: s.level, detail: s.tip })),
    },
    {
      id: "stress",
      title: "Word stress",
      text: "Which syllable is strongest in a word.",
      sets: stress.map((s) => ({ slug: s.slug, title: s.title, level: s.level, detail: s.explanation })),
    },
    {
      id: "intonation",
      title: "Intonation",
      text: "How your voice goes up or down.",
      sets: intonation.map((s) => ({ slug: s.slug, title: s.title, level: s.level, detail: s.explanation })),
    },
  ];

  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <LabHeader title="Pronunciation">
        <p>
          Hear the difference first, then practise saying it. Model audio is a computer voice: a helpful guide, though
          not as natural as a real speaker.
        </p>
        <DeviceAudioNote filesAvailable={false} />
      </LabHeader>
      <Alert tone="info" title="No pronunciation scores">
        EnglishFlow doesn&apos;t score your pronunciation — no service connected here can do that reliably. You can
        record yourself to compare with the model (the recording stays on your device), and optionally see what your
        browser&apos;s speech recognition hears. Every speaking task also has a version without speaking, and nothing
        else in the course depends on it.
      </Alert>
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`${g.id}-heading`} className="space-y-3">
          <div>
            <h2 id={`${g.id}-heading`} className="text-ink text-lg font-semibold">
              {g.title}
            </h2>
            <p className="text-muted text-sm">{g.text}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.sets.map((s) => (
              <LabItemCard
                key={s.slug}
                href={`/app/pronunciation/${s.slug}`}
                title={s.title}
                level={s.level}
                done={done(s.slug)}
              >
                {s.detail}
              </LabItemCard>
            ))}
          </ul>
        </section>
      ))}
    </Container>
  );
}
