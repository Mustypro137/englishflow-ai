import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import type { MasteryStateName } from "@/lib/learning/mastery";
import { requireUser } from "@/server/auth/session";
import { getLearnerSnapshot } from "@/server/db/activity";
import { getCurriculumGraph } from "@/server/db/curriculum";
import { getProfile } from "@/server/db/learner-profile";

export const metadata: Metadata = { title: "Grammar" };

const STATE: Record<MasteryStateName, { label: string; tone: BadgeTone }> = {
  new: { label: "Not started", tone: "neutral" },
  learning: { label: "Learning", tone: "accent" },
  practicing: { label: "Practising", tone: "primary" },
  mastered: { label: "Mastered", tone: "success" },
};

export default async function GrammarPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const [snapshot, graph] = await Promise.all([getLearnerSnapshot(user.id), getCurriculumGraph()]);
  const stateBySlug = new Map(snapshot.concepts.map((c) => [c.slug, c.state]));
  const nameBySlug = new Map(graph.concepts.map((c) => [c.slug, c.name]));
  const lessonBySlug = new Map(snapshot.lessons.map((l) => [l.slug, l]));
  const grammar = graph.concepts.filter((c) => c.skill === "grammar");
  const levels = [...new Set(grammar.map((c) => c.levelCode))];

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Grammar</h1>
        <p className="text-muted mt-2">
          Every grammar topic in the course, level by level, with how well you know it and the lesson that teaches it. A
          topic becomes <strong className="text-ink">mastered</strong> only after you remember it in spaced reviews on
          two separate days, without help.
        </p>
      </div>

      {levels.map((level) => {
        const concepts = grammar.filter((c) => c.levelCode === level);
        const mastered = concepts.filter((c) => stateBySlug.get(c.slug) === "mastered").length;
        const headingId = `grammar-${level}`;
        return (
          <section key={level} aria-labelledby={headingId}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={headingId} className="text-ink text-lg font-semibold">
                {level}
              </h2>
              <span className="text-muted text-sm">
                {mastered} of {concepts.length} mastered
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {concepts.map((c) => {
                const state = STATE[stateBySlug.get(c.slug) ?? "new"];
                const lessons = c.lessonSlugs.map((s) => lessonBySlug.get(s)).filter((l) => l !== undefined);
                const published = lessons.filter((l) => l.status === "published");
                return (
                  <li key={c.slug} className="border-border bg-surface rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-ink font-medium">{c.name}</h3>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </div>
                    <p className="text-muted mt-1 text-sm">{c.description}</p>
                    {c.prerequisites.length > 0 ? (
                      <p className="text-muted mt-2 text-xs">
                        Builds on: {c.prerequisites.map((p) => nameBySlug.get(p) ?? p).join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      {published.length > 0 ? (
                        published.map((l, i) => (
                          <span key={l.slug}>
                            {i > 0 ? " · " : ""}
                            <Link href={`/app/learn/${l.slug}`} className="text-primary font-medium underline">
                              {l.title}
                            </Link>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">Lesson planned — not written yet.</span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Container>
  );
}
