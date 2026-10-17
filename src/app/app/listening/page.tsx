import type { Metadata } from "next";
import { DeviceAudioNote } from "@/components/audio/device-audio-note";
import { ByLevel, LabHeader, LabItemCard } from "@/components/labs/lab-parts";
import { Container } from "@/components/ui/container";
import { listeningClips } from "@/lib/audio/clips";
import { byClosestLevel, labContent } from "@/lib/labs/content";
import { toTracks } from "@/server/audio/manifest";
import { getLabHistory } from "@/server/db/labs";
import { requireLearner } from "@/server/labs/guard";

export const metadata: Metadata = { title: "Listening" };

const KIND_LABEL = {
  dialogue: "Conversation",
  monologue: "One speaker",
  announcement: "Announcement",
  voicemail: "Voicemail",
} as const;

export default async function ListeningPage() {
  const { user, profile } = await requireLearner();
  const items = byClosestLevel(labContent().listeningItems, profile.estimatedLevel);
  const history = await getLabHistory(user.id, "listening");
  const filesAvailable = items.some((i) => toTracks(listeningClips(i)).every((t) => t.url));

  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <LabHeader title="Listening">
        <p>
          Listen first, answer the questions, then check the transcript, study useful phrases and try a short dictation.
          You can listen as many times as you like.
        </p>
        <DeviceAudioNote filesAvailable={filesAvailable} />
      </LabHeader>
      <ByLevel
        items={items}
        render={(item) => {
          const h = history.get(item.slug);
          return (
            <LabItemCard
              key={item.slug}
              href={`/app/listening/${item.slug}`}
              title={item.title}
              level={item.level}
              minutes={item.estimatedMinutes}
              meta={KIND_LABEL[item.kind]}
              done={
                h
                  ? `Done${h.times > 1 ? ` ${h.times} times` : ""} · last time ${h.lastCorrect} of ${h.lastTotal} right first time`
                  : null
              }
            >
              {item.context}
            </LabItemCard>
          );
        }}
      />
    </Container>
  );
}
