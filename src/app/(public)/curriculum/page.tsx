import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/page-intro";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { CONTENT_STATUS_LABELS, LEVELS, SKILL_STRANDS, type ContentStatus } from "@/lib/curriculum-overview";

export const metadata: Metadata = {
  title: "Curriculum",
  description: "The EnglishFlow AI curriculum from A1 to C2, and the current content status of each level.",
};

const STATUS_TONE: Record<ContentStatus, BadgeTone> = {
  planned: "neutral",
  in_development: "warning",
  partial: "primary",
  complete: "success",
};

export default function CurriculumPage() {
  return (
    <>
      <PageIntro eyebrow="Curriculum" title="From first words to full fluency">
        <p>
          The curriculum is organised by level, module, unit and lesson. Every lesson has a clear objective,
          prerequisites, explanation, examples, common mistakes, practice and a way to show you can use it.
        </p>
      </PageIntro>

      <Container width="narrow" className="space-y-14 py-12">
        <section aria-labelledby="levels-heading">
          <h2 id="levels-heading" className="text-ink text-xl font-semibold">
            Levels and content status
          </h2>
          <p className="text-muted mt-2 text-sm">
            Levels are being built in order, starting with A1. This list shows what exists today.
          </p>
          <ol className="mt-6 space-y-4">
            {LEVELS.map((level) => (
              <li key={level.code} className="border-border bg-surface rounded-lg border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-ink text-lg font-semibold">
                    {level.code} <span className="text-muted font-normal">· {level.name}</span>
                  </h3>
                  <Badge tone={STATUS_TONE[level.contentStatus]}>{CONTENT_STATUS_LABELS[level.contentStatus]}</Badge>
                </div>
                <p className="text-ink/90 mt-2">{level.summary}</p>
                <p className="text-muted mt-3 text-sm">
                  <span className="text-ink font-medium">Topics include:</span> {level.focus.join(", ")}.
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="strands-heading">
          <h2 id="strands-heading" className="text-ink text-xl font-semibold">
            Skill strands
          </h2>
          <p className="text-muted mt-2 text-sm">
            Each level develops eight skills. An exercise can practise several at once — for example, a listening
            question can also check vocabulary and past-tense understanding.
          </p>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {SKILL_STRANDS.map((s) => (
              <div key={s.name}>
                <dt className="text-ink font-medium">{s.name}</dt>
                <dd className="text-muted mt-1 text-sm">{s.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="cefr-note">
          <h2 id="cefr-note" className="text-ink text-xl font-semibold">
            About CEFR levels
          </h2>
          <p className="text-ink/90 mt-2">
            CEFR (the Common European Framework of Reference for Languages) is used here as a framework for organising
            what to learn. A short online check cannot certify your exact level, so EnglishFlow always describes your
            level as an estimate and shows separate results for each skill.
          </p>
        </section>
      </Container>
    </>
  );
}
