import { CircleCheck, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/server/auth/session";
import { getChallenges } from "@/server/db/activity";
import { MAX_CHALLENGE_TEXT } from "@/server/db/challenges";
import { getProfile } from "@/server/db/learner-profile";
import { WritingForm } from "./writing-form";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const challenges = await getChallenges(user.id);
  const daily = challenges.filter((c) => c.challenge.period === "daily");
  const weekly = challenges.filter((c) => c.challenge.period === "weekly");

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Challenges</h1>
        <p className="text-muted mt-2">
          Small goals that reward recalling and using English on your own. Progress is counted from what you actually do
          in lessons, reviews and here. Daily challenges change at midnight, your time; the weekly one on Monday.
        </p>
      </div>
      <Group title="Today" items={daily} />
      <Group title="This week" items={weekly} />
    </Container>
  );
}

function Group({ title, items }: { title: string; items: Awaited<ReturnType<typeof getChallenges>> }) {
  const headingId = `challenges-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-ink text-lg font-semibold">
        {title}
      </h2>
      <ul className="space-y-4">
        {items.map((c) => {
          const done = c.completedAt !== null;
          return (
            <li key={c.challenge.slug} className="border-border bg-surface rounded-lg border p-5">
              <div className="flex items-start gap-3">
                {done ? (
                  <CircleCheck aria-hidden className="text-success mt-0.5 size-6 shrink-0" />
                ) : (
                  <Trophy aria-hidden className="text-primary mt-0.5 size-6 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-ink font-semibold">{c.challenge.title}</h3>
                    {done ? <Badge tone="success">Completed</Badge> : null}
                  </div>
                  <p className="text-muted mt-1 text-sm">{c.challenge.description}</p>
                  <div className="mt-3">
                    <ProgressBar
                      tone={done ? "success" : "primary"}
                      value={done ? c.progress.target : c.progress.current}
                      max={c.progress.target}
                      label={`${c.challenge.title} progress`}
                    />
                    <p className="text-muted mt-1 text-xs">
                      {done
                        ? "Done"
                        : c.challenge.metric === "clear_reviews"
                          ? "Not yet — review everything that's due."
                          : `${c.progress.current} of ${c.progress.target}`}
                    </p>
                  </div>
                  {c.challenge.metric === "original_sentences" ? (
                    <WritingForm
                      challengeSlug={c.challenge.slug}
                      target={c.challenge.target}
                      initialText={c.text ?? ""}
                      maxLength={MAX_CHALLENGE_TEXT}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
