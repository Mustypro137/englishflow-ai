import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LabHeader } from "@/components/labs/lab-parts";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { byClosestLevel, labContent } from "@/lib/labs/content";
import { stableShuffle } from "@/lib/learning/client-exercise";
import { localDateKey } from "@/lib/learning/time";
import { getLearnerSnapshot } from "@/server/db/activity";
import { getPracticePool } from "@/server/db/curriculum";
import { requireLearner } from "@/server/labs/guard";
import { BuildSet, ExpansionStudio, OriginalSentences } from "./studio";

export const metadata: Metadata = { title: "Sentence studio" };

const BUILD_TYPES = new Set(["word_order", "transformation", "sentence_completion"]);

export default async function SentencesPage() {
  const { user, profile } = await requireLearner();
  const snapshot = await getLearnerSnapshot(user.id);
  const started = snapshot.lessons.filter((l) => l.status === "published" && l.answered > 0);
  const startedConcepts = new Set(started.flatMap((l) => l.conceptSlugs));
  const pool = (await getPracticePool(started.map((l) => l.id))).filter((p) => BUILD_TYPES.has(p.exercise.type));
  const build = stableShuffle(pool, `${user.id}:${localDateKey(snapshot.now, snapshot.timezone)}:studio`)
    .slice(0, 6)
    .map((p) => p.exercise);
  const { expansionTasks, originalSentencePrompts } = labContent();
  const prompts = byClosestLevel(originalSentencePrompts, profile.estimatedLevel).sort(
    (a, b) => Number(startedConcepts.has(b.concept)) - Number(startedConcepts.has(a.concept)),
  );

  return (
    <Container width="narrow" className="space-y-10 py-8 sm:py-10">
      <LabHeader title="Sentence studio">
        <p>
          Three ways to build sentences: put words in order and transform sentences, grow a simple sentence step by
          step, then write your own sentences with a pattern — without copying an example.
        </p>
      </LabHeader>

      <section aria-labelledby="build-heading" className="space-y-4">
        <h2 id="build-heading" className="text-ink text-xl font-semibold">
          1. Build and transform
        </h2>
        {build.length ? (
          <>
            <p className="text-muted text-sm">
              Word order, transformation and sentence completion from lessons you&apos;ve started.
            </p>
            <BuildSet exercises={build} />
          </>
        ) : (
          <div className="border-border bg-surface rounded-lg border p-5">
            <p className="text-ink text-sm">
              Start a lesson first — this section uses word-order and transformation exercises from lessons you&apos;ve
              started.
            </p>
            <Link href="/app/learn" className={buttonClasses({ variant: "secondary", className: "mt-3" })}>
              <BookOpen aria-hidden /> Go to the curriculum
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="expand-heading" className="space-y-4">
        <h2 id="expand-heading" className="text-ink text-xl font-semibold">
          2. Expand a sentence
        </h2>
        <p className="text-muted text-sm">
          Add one thing at a time. The studio checks that your sentence keeps its words and grows; then compare with an
          example.
        </p>
        <ExpansionStudio tasks={byClosestLevel(expansionTasks, profile.estimatedLevel)} />
      </section>

      <section aria-labelledby="original-heading" className="space-y-4">
        <h2 id="original-heading" className="text-ink text-xl font-semibold">
          3. Your own sentences
        </h2>
        <p className="text-muted text-sm">
          Write something true about your life using the pattern. It&apos;s saved to your writing, where you can get
          feedback and rewrite it.
        </p>
        <OriginalSentences prompts={prompts} />
      </section>
    </Container>
  );
}
