import type { Metadata } from "next";
import { ByLevel, LabHeader, LabItemCard } from "@/components/labs/lab-parts";
import { TutorSetupNotice } from "@/components/tutor/parts";
import { Container } from "@/components/ui/container";
import { byClosestLevel, labContent } from "@/lib/labs/content";
import { isAiConfigured } from "@/server/ai/provider";
import { requireLearner } from "@/server/labs/guard";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage() {
  const { profile } = await requireLearner();
  const scenarios = byClosestLevel(labContent().scenarios, profile.estimatedLevel);
  const configured = isAiConfigured();
  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <LabHeader title="Conversation">
        <p>
          Practise real situations by role-play. Read the goals and useful phrases, study the example conversation, then
          have your own conversation with the AI tutor playing the other person.
        </p>
      </LabHeader>
      {configured ? null : (
        <div className="space-y-2">
          <TutorSetupNotice feature="AI role-play" />
          <p className="text-muted text-sm">
            Each scenario still has goals, useful phrases and a complete example conversation you can read or listen to.
          </p>
        </div>
      )}
      <ByLevel
        items={scenarios}
        render={(s) => (
          <LabItemCard key={s.slug} href={`/app/conversation/${s.slug}`} title={s.title} level={s.level}>
            {s.setting}
          </LabItemCard>
        )}
      />
    </Container>
  );
}
