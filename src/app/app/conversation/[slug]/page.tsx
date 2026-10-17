import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiHonestyNote, TutorSetupNotice } from "@/components/tutor/parts";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { scenarioClips } from "@/lib/audio/clips";
import { findScenario } from "@/lib/labs/content";
import { isAiConfigured } from "@/server/ai/provider";
import { toTracks } from "@/server/audio/manifest";
import { getPreferences } from "@/server/db/learner-profile";
import { listScenarioConversations } from "@/server/db/tutor";
import { requireLearner } from "@/server/labs/guard";
import { ModelDialogue } from "./model-dialogue";

export async function generateMetadata({ params }: PageProps<"/app/conversation/[slug]">): Promise<Metadata> {
  const s = findScenario((await params).slug);
  return { title: s ? `Conversation: ${s.title}` : "Conversation" };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function ScenarioPage({ params }: PageProps<"/app/conversation/[slug]">) {
  const { user } = await requireLearner();
  const scenario = findScenario((await params).slug);
  if (!scenario) notFound();
  const configured = isAiConfigured();
  const [prefs, previous] = await Promise.all([
    getPreferences(user.id),
    listScenarioConversations(user.id, scenario.slug),
  ]);

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href="/app/conversation" className="text-primary hover:underline">
          Conversation
        </Link>
        <span className="text-muted"> / {scenario.level}</span>
      </nav>
      <div className="space-y-3">
        <Badge tone="primary">{scenario.level}</Badge>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">{scenario.title}</h1>
        <p className="text-ink">{scenario.setting}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">You are</dt>
            <dd className="text-ink font-medium">{scenario.learnerRole}</dd>
          </div>
          <div>
            <dt className="text-muted">You&apos;re talking to</dt>
            <dd className="text-ink font-medium">
              {scenario.partnerName}, {scenario.partnerRole}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="goals-heading" className="border-border bg-surface rounded-lg border p-4">
          <h2 id="goals-heading" className="text-ink mb-2 font-semibold">
            Your goals
          </h2>
          <ul className="text-ink list-disc space-y-1 pl-5 text-sm">
            {scenario.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="phrases-heading" className="border-border bg-surface rounded-lg border p-4">
          <h2 id="phrases-heading" className="text-ink mb-2 font-semibold">
            Useful phrases
          </h2>
          <ul className="text-ink space-y-1 text-sm">
            {scenario.usefulPhrases.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="practice-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <h2 id="practice-heading" className="text-ink mb-1 text-lg font-semibold">
          Your conversation
        </h2>
        {configured ? (
          <>
            <p className="text-muted mb-4 text-sm">
              Reply to {scenario.partnerName} in your own words. If you make a mistake that matters, you&apos;ll get a
              short tip. Type &ldquo;stop&rdquo; at any time for feedback.
            </p>
            <div className="mb-5">
              <AiHonestyNote sharing={prefs.aiContextSharing} />
            </div>
            <TutorChat
              conversation={null}
              initialMode="conversation"
              defaultStyle="concise"
              lesson={null}
              scenario={{
                slug: scenario.slug,
                partnerName: scenario.partnerName,
                partnerVoice: scenario.partnerVoice,
                opening: scenario.opening,
              }}
            />
          </>
        ) : (
          <div className="space-y-3">
            <TutorSetupNotice feature="AI role-play" />
            <p className="text-ink text-sm">
              Without the AI, practise with the example conversation below: read {scenario.partnerName}&apos;s lines and
              say (or write) your own reply before you look at the example.
            </p>
          </div>
        )}
        {previous.length ? (
          <div className="mt-6">
            <h3 className="text-ink text-sm font-semibold">Your earlier role-plays</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {previous.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/tutor/${c.id}`} className="text-primary hover:underline">
                    {dateFormat.format(c.updatedAt)} · {c._count.messages} messages
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <ModelDialogue
        partnerName={scenario.partnerName}
        lines={scenario.modelDialogue}
        tracks={toTracks(scenarioClips(scenario))}
      />
    </Container>
  );
}
