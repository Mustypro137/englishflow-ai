import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "How learning works",
  description:
    "The learning methods behind EnglishFlow AI: active recall, spaced repetition, evidence-based progress and AI tutoring.",
};

const SECTIONS = [
  {
    id: "active-recall",
    title: "Answer first, then check",
    body: [
      "Most reviews ask you to produce the answer before you see it. Trying to remember — even when you get it wrong — strengthens memory far more than rereading.",
      "After you answer, you get feedback that explains why, not just whether, you were right.",
    ],
  },
  {
    id: "spaced-repetition",
    title: "Reviews at the right moment",
    body: [
      "Words, phrases and grammar points come back at increasing intervals — for example after one day, three days, a week, two weeks, a month. You rate each review (Again, Hard, Good or Easy) and the schedule adapts.",
      "Wrong answers bring an item back sooner. Easy, repeated successes push it further away. Your schedule follows your own time zone.",
    ],
  },
  {
    id: "mastery",
    title: "Progress means you can do it alone",
    body: [
      "Opening a lesson counts as exposure, not learning. A concept is marked as mastered only when you recall it correctly, without hints, on separate days after you first learned it.",
      "Progress indicators always explain what they measure. You will never see invented percentages.",
    ],
  },
  {
    id: "mixed-practice",
    title: "Mixed, cumulative practice",
    body: [
      "Practice sessions mix new material with earlier topics, so you learn to choose the right form — not just repeat the one you studied today.",
      "Recurring mistakes are tracked and turned into targeted practice.",
    ],
  },
  {
    id: "ai-tutor",
    title: "An AI tutor that makes you think",
    body: [
      "The tutor adapts its English to your level, gives hints before full answers when you want it to, explains your mistakes and tells you when usage depends on context or region.",
      "AI is used where it helps — explanations, feedback on open-ended writing, extra practice — and everything else works without it. AI suggestions never change your level without real assessment evidence.",
    ],
  },
  {
    id: "levels",
    title: "CEFR as a map, not a verdict",
    body: [
      "The curriculum is organised by the CEFR levels A1 to C2. The placement check gives an estimated starting level and a skill-by-skill profile. It is an estimate: you can adjust your starting point or retake it at any time.",
      "Speaking is always optional. You will never need to speak to progress through grammar, reading or writing lessons.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro eyebrow="How learning works" title="Methods that build lasting, independent ability">
        <p>
          EnglishFlow AI is built on well-established learning techniques. Here is how each one shows up in the product.
        </p>
      </PageIntro>
      <Container width="narrow" className="py-12">
        <nav aria-label="On this page" className="border-border bg-surface mb-10 rounded-lg border p-4">
          <p className="text-ink text-sm font-semibold">On this page</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary rounded-sm hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6">
              <h2 id={`${s.id}-h`} className="text-ink text-xl font-semibold">
                {s.title}
              </h2>
              <div className="prose-reading text-ink/90 mt-3 space-y-3">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
