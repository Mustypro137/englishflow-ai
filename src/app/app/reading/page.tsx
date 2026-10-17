import type { Metadata } from "next";
import { ByLevel, LabHeader, LabItemCard } from "@/components/labs/lab-parts";
import { Container } from "@/components/ui/container";
import { byClosestLevel, labContent } from "@/lib/labs/content";
import { getLabHistory } from "@/server/db/labs";
import { requireLearner } from "@/server/labs/guard";

export const metadata: Metadata = { title: "Reading" };

const GENRE_LABEL = {
  story: "Story",
  email: "Email",
  article: "Article",
  dialogue: "Dialogue",
  notice: "Notice",
  review: "Review",
  message: "Messages",
} as const;

export default async function ReadingPage() {
  const { user, profile } = await requireLearner();
  const texts = byClosestLevel(labContent().readingTexts, profile.estimatedLevel);
  const history = await getLabHistory(user.id, "reading");
  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <LabHeader title="Reading">
        <p>
          Short graded texts with questions about the main points, what the writer means, and words in context.
          Highlighted words have a definition you can save — with the sentence you found them in.
        </p>
      </LabHeader>
      <ByLevel
        items={texts}
        render={(t) => {
          const h = history.get(t.slug);
          return (
            <LabItemCard
              key={t.slug}
              href={`/app/reading/${t.slug}`}
              title={t.title}
              level={t.level}
              minutes={t.estimatedMinutes}
              meta={GENRE_LABEL[t.genre]}
              done={
                h
                  ? `Read${h.times > 1 ? ` ${h.times} times` : ""} · last time ${h.lastCorrect} of ${h.lastTotal} right first time`
                  : null
              }
            >
              {t.summary}
            </LabItemCard>
          );
        }}
      />
    </Container>
  );
}
