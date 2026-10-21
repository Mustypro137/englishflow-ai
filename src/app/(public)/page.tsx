import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SampleExercise } from "@/components/marketing/sample-exercise";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LEVELS } from "@/lib/curriculum-overview";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  {
    title: "Find your level",
    text: "A short placement check, with a listening part, gives you an estimated starting point. You can always change it.",
  },
  {
    title: "Learn with active recall",
    text: "Every lesson makes you answer, not just read. Feedback shows exactly what to fix and why.",
  },
  {
    title: "Review before you forget",
    text: "Spaced repetition brings words and grammar back on the day you need them, not every day.",
  },
  {
    title: "Use it for real",
    text: "Skill labs for listening, reading, writing and speaking, plus role-plays with the AI tutor.",
  },
];

/** Content status per level, matching the curriculum page: only A1 has lessons so far. */
const LEVEL_STATUS: Record<string, string> = { A1: "Lessons ready now", A2: "Coming next" };

const CHAT = [
  { from: "learner", text: "Why is it “she goes” and not “she go”?" },
  {
    from: "tutor",
    text: "Good question! Look at who does the action. Is “she” one person or more than one? What happens to the verb after he, she or it?",
  },
  { from: "learner", text: "One person… so the verb gets an -s?" },
  { from: "tutor", text: "Exactly. And “go” ends in -o, so it becomes “goes”. Try one: “He ___ (watch) TV.”" },
] as const;

const eyebrow = "text-primary text-sm font-semibold";
const sectionTitle = "text-ink mt-2 font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl";

export default function HomePage() {
  return (
    <>
      <section>
        <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="bg-primary-soft text-primary-hover inline-flex rounded-full px-3 py-1 text-sm font-semibold">
              A1 to C2 · learn at your own pace
            </p>
            <h1 className="text-ink mt-5 font-serif text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              English you can actually use, learned one clear step at a time.
            </h1>
            <p className="text-muted mt-6 max-w-xl text-lg leading-relaxed">
              Short lessons, real practice and reviews that come back right before you forget. Every day, EnglishFlow
              tells you what to do next and why.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
                Find my level in 5 minutes <ArrowRight aria-hidden />
              </Link>
              <Link href="/how-it-works" className={buttonClasses({ size: "lg", variant: "secondary" })}>
                See how it works
              </Link>
            </div>
            <p className="text-muted mt-5 text-sm">
              Free while in development. The first A1 lessons are ready; more levels are on the way.
            </p>
          </div>
          <div className="lg:[&>section]:shadow-[0_30px_60px_-30px_rgb(26_31_43/0.25)]">
            <SampleExercise />
          </div>
        </Container>
      </section>

      <section aria-labelledby="how-heading" className="border-border bg-surface border-y py-20">
        <Container>
          <p className={eyebrow}>How it works</p>
          <h2 id="how-heading" className={sectionTitle}>
            Learn it, use it, keep it.
          </h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-border bg-paper rounded-xl border p-6">
                <span aria-hidden className="text-primary font-serif text-4xl">
                  {i + 1}
                </span>
                <h3 className="text-ink mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="text-muted mt-2 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="levels-heading" className="py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={eyebrow}>Curriculum</p>
            <h2 id="levels-heading" className={sectionTitle}>
              One path from A1 to C2, and you always know where you are.
            </h2>
            <p className="text-muted mt-5 text-lg leading-relaxed">
              Lessons follow the CEFR levels. Each topic shows what it needs first, so you never meet a lesson you
              aren&apos;t ready for.
            </p>
            <Link href="/curriculum" className={buttonClasses({ variant: "link", className: "mt-4 px-0" })}>
              See what each level covers <ArrowRight aria-hidden />
            </Link>
          </div>
          <ol aria-label="CEFR levels" className="flex flex-col gap-2.5">
            {LEVELS.map((level) => {
              const open = level.code === "A1";
              return (
                <li
                  key={level.code}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-5 py-4",
                    open ? "bg-primary text-on-primary" : "border-border bg-surface border",
                  )}
                >
                  <span className={cn("w-11 font-serif text-2xl font-semibold", !open && "text-primary")}>
                    {level.code}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{level.name}</span>
                    <span className={cn("block text-sm", open ? "opacity-90" : "text-muted")}>
                      {LEVEL_STATUS[level.code] ?? "Outline"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      <section data-theme="dark" aria-labelledby="tutor-heading" className="bg-paper text-ink py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={eyebrow}>AI tutor</p>
            <h2 id="tutor-heading" className={sectionTitle}>
              A patient tutor that gives hints before answers.
            </h2>
            <p className="text-muted mt-5 text-lg leading-relaxed">
              Ask about any lesson, practise a conversation or get feedback on your writing. It only uses your learning
              history if you turn that on.
            </p>
          </div>
          <figure className="m-0">
            <figcaption className="sr-only">Example conversation with the AI tutor</figcaption>
            <ul className="flex flex-col gap-3">
              {CHAT.map((m) => (
                <li
                  key={m.text}
                  className={cn(
                    "max-w-[85%] px-4 py-3 leading-relaxed",
                    m.from === "learner"
                      ? "bg-primary text-on-primary self-end rounded-2xl rounded-br-sm"
                      : "bg-sunken self-start rounded-2xl rounded-bl-sm",
                  )}
                >
                  <span className="sr-only">{m.from === "learner" ? "Learner: " : "Tutor: "}</span>
                  {m.text}
                </li>
              ))}
            </ul>
            <p className="text-muted mt-3 text-sm">AI replies can be wrong. Check anything important with a lesson.</p>
          </figure>
        </Container>
      </section>

      <section aria-labelledby="start-heading" className="py-24 text-center">
        <Container width="narrow">
          <h2 id="start-heading" className="text-ink font-serif text-3xl font-semibold tracking-tight sm:text-5xl">
            Ten minutes today is a real start.
          </h2>
          <p className="text-muted mx-auto mt-5 max-w-lg text-lg">
            Set your daily goal and EnglishFlow plans each session around it.
          </p>
          <Link href="/sign-up" className={buttonClasses({ size: "lg", className: "mt-8" })}>
            Create my free account
          </Link>
        </Container>
      </section>
    </>
  );
}
