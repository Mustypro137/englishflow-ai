import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { listeningClips } from "@/lib/audio/clips";
import { byClosestLevel, findListening, labContent } from "@/lib/labs/content";
import { toTracks } from "@/server/audio/manifest";
import { getLabQuestions } from "@/server/db/labs";
import { requireLearner } from "@/server/labs/guard";
import { ListeningSession } from "./listening-session";

export async function generateMetadata({ params }: PageProps<"/app/listening/[slug]">): Promise<Metadata> {
  const item = findListening((await params).slug);
  return { title: item ? `Listening: ${item.title}` : "Listening" };
}

export default async function ListeningItemPage({ params }: PageProps<"/app/listening/[slug]">) {
  const { profile } = await requireLearner();
  const item = findListening((await params).slug);
  if (!item) notFound();
  const questions = (await getLabQuestions(item.questions.map((q) => q.slug))).map((q) => q.exercise);
  const tracks = toTracks(listeningClips(item));
  const names = new Map(item.speakers.map((s) => [s.id, s.name]));
  const ordered = byClosestLevel(labContent().listeningItems, profile.estimatedLevel);
  const next = ordered[(ordered.findIndex((i) => i.slug === item.slug) + 1) % ordered.length];

  return (
    <Container width="narrow" className="space-y-6 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/listening" className="text-primary hover:underline">
          Listening
        </Link>
        <span className="text-muted"> / {item.level}</span>
      </nav>
      <ListeningSession
        item={{
          slug: item.slug,
          title: item.title,
          level: item.level,
          context: item.context,
          lines: item.lines.map((l) => ({ speaker: names.get(l.speaker) ?? l.speaker, text: l.text })),
          dictation: item.dictation,
          phrases: item.phrases,
        }}
        tracks={tracks}
        questions={questions}
        expectedQuestions={item.questions.length}
        next={next && next.slug !== item.slug ? { slug: next.slug, title: next.title } : null}
      />
    </Container>
  );
}
