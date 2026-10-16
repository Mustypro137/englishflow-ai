import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SampleExercise } from "@/components/marketing/sample-exercise";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LEVELS, SKILL_STRANDS } from "@/lib/curriculum-overview";

const QUESTIONS = [
  {
    q: "What should I learn next?",
    a: "A structured A1–C2 curriculum with prerequisites, and recommendations that tell you why each activity was chosen.",
  },
  {
    q: "What do I need to review?",
    a: "Spaced repetition brings words and grammar back just before you are likely to forget them. Your recurring mistakes become targeted practice.",
  },
  {
    q: "Can I use it without help?",
    a: "Progress counts only when you recall and produce English on your own — on a later day, without hints. Opening a lesson is not mastery.",
  },
];

const LOOP = [
  {
    step: "Learn",
    text: "Short explanations with worked and contrasting examples, plus the mistakes learners commonly make.",
  },
  {
    step: "Practise",
    text: "Guided exercises first, then independent ones, with an explanation after every wrong answer.",
  },
  {
    step: "Recall",
    text: "Answer before you see the solution. Reviews return at growing intervals based on how well you remembered.",
  },
  { step: "Apply", text: "Write your own sentences, handle real situations and explain ideas in English." },
];

export default function HomePage() {
  return (
    <>
      <section className="border-border bg-surface border-b">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="text-primary text-sm font-medium">English from A1 to C2</p>
            <h1 className="text-ink mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Learn English you can use on your own.
            </h1>
            <p className="text-muted mt-5 max-w-xl text-lg">
              EnglishFlow AI combines structured lessons, active recall, spaced repetition and an AI tutor — so you
              remember what you learn and can build your own sentences without copying examples.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/how-it-works" className={buttonClasses({ size: "lg" })}>
                See how it works <ArrowRight aria-hidden />
              </Link>
              <Link href="/curriculum" className={buttonClasses({ size: "lg", variant: "secondary" })}>
                Explore the curriculum
              </Link>
            </div>
            <p className="text-muted mt-6 text-sm">
              EnglishFlow AI is in development. You can create an account now; the first lessons are being built next.
            </p>
          </div>
          <SampleExercise />
        </Container>
      </section>

      <section aria-labelledby="questions-heading" className="py-16">
        <Container>
          <h2 id="questions-heading" className="text-ink text-2xl font-semibold tracking-tight">
            Built around three questions every learner has
          </h2>
          <dl className="mt-8 grid gap-8 md:grid-cols-3">
            {QUESTIONS.map((item, i) => (
              <div key={item.q} className="border-primary border-t-2 pt-4">
                <dt className="text-ink font-semibold">
                  <span className="text-primary mr-2">{i + 1}.</span>
                  {item.q}
                </dt>
                <dd className="text-muted mt-2">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section aria-labelledby="loop-heading" className="border-border bg-surface border-y py-16">
        <Container>
          <h2 id="loop-heading" className="text-ink text-2xl font-semibold tracking-tight">
            One learning loop, repeated at every level
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((item, i) => (
              <li key={item.step} className="flex gap-4">
                <span
                  aria-hidden
                  className="bg-primary-soft text-primary-hover flex size-9 shrink-0 items-center justify-center rounded-full font-semibold"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-ink font-semibold">{item.step}</p>
                  <p className="text-muted mt-1 text-sm">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="skills-heading" className="py-16">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="skills-heading" className="text-ink text-2xl font-semibold tracking-tight">
              Every skill tracked separately
            </h2>
            <p className="text-muted mt-3">
              Your reading can be ahead of your listening, and that is normal. EnglishFlow tracks each skill on its own,
              so practice goes where you need it.
            </p>
            <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {SKILL_STRANDS.map((s) => (
                <li key={s.name} className="text-sm">
                  <span className="text-ink font-medium">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-ink text-2xl font-semibold tracking-tight">Six levels, one path</h2>
            <p className="text-muted mt-3">
              The curriculum follows the CEFR framework. A short placement check gives you an estimated starting point —
              an estimate, not a certificate — and you can always adjust it.
            </p>
            <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="CEFR levels">
              {LEVELS.map((l) => (
                <li key={l.code} className="border-border bg-surface rounded-md border px-2 py-3 text-center">
                  <span className="text-ink block font-semibold">{l.code}</span>
                  <span className="text-muted block text-xs">{l.name}</span>
                </li>
              ))}
            </ol>
            <Link href="/curriculum" className={buttonClasses({ variant: "link", className: "mt-4 px-0" })}>
              See what each level covers <ArrowRight aria-hidden />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
