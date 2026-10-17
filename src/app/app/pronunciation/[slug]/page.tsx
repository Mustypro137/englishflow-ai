import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { sentenceClip, wordClip } from "@/lib/audio/clips";
import { findPronunciationSet } from "@/lib/labs/content";
import { toTracks } from "@/server/audio/manifest";
import { requireLearner } from "@/server/labs/guard";
import { IntonationPractice, MinimalPairsPractice, StressPractice } from "./practice";

export async function generateMetadata({ params }: PageProps<"/app/pronunciation/[slug]">): Promise<Metadata> {
  const found = findPronunciationSet((await params).slug);
  return { title: found ? `Pronunciation: ${found.set.title}` : "Pronunciation" };
}

export default async function PronunciationSetPage({ params }: PageProps<"/app/pronunciation/[slug]">) {
  await requireLearner();
  const found = findPronunciationSet((await params).slug);
  if (!found) notFound();
  const { set } = found;

  let body;
  if (found.kind === "pairs") {
    const words = [...new Set(found.set.pairs.flat())];
    const tracks = toTracks(words.map(wordClip));
    body = (
      <MinimalPairsPractice
        set={found.set}
        wordTracks={Object.fromEntries(words.map((w, i) => [w, tracks[i]]))}
        sentenceTracks={toTracks(found.set.sentences.map((t, i) => sentenceClip(found.set.slug, i, t)))}
      />
    );
  } else if (found.kind === "stress") {
    body = <StressPractice set={found.set} wordTracks={toTracks(found.set.items.map((i) => wordClip(i.word)))} />;
  } else {
    body = (
      <IntonationPractice
        set={found.set}
        tracks={toTracks(found.set.items.map((item, i) => sentenceClip(found.set.slug, i, item.sentence)))}
      />
    );
  }

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/pronunciation" className="text-primary hover:underline">
          Pronunciation
        </Link>
        <span className="text-muted"> / {set.level}</span>
      </nav>
      <div className="space-y-2">
        <Badge tone="primary">{set.level}</Badge>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{set.title}</h1>
      </div>
      {body}
    </Container>
  );
}
