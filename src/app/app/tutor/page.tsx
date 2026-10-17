import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AiHonestyNote, ConversationList, TutorSetupNotice } from "@/components/tutor/parts";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Container } from "@/components/ui/container";
import { isTutorMode } from "@/lib/ai/modes";
import { isAiConfigured } from "@/server/ai/provider";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { getPreferences, getProfile } from "@/server/db/learner-profile";
import { listConversations } from "@/server/db/tutor";

export const metadata: Metadata = { title: "AI tutor" };

export default async function TutorPage({ searchParams }: PageProps<"/app/tutor">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const params = await searchParams;
  const [prefs, conversations] = await Promise.all([getPreferences(user.id), listConversations(user.id)]);
  const configured = isAiConfigured();
  const lessonSlug = typeof params.lesson === "string" ? params.lesson : null;
  const lesson =
    configured && lessonSlug && /^[a-z0-9-]{1,100}$/.test(lessonSlug)
      ? await prisma.lesson.findFirst({
          where: { slug: lessonSlug, status: "published", archivedAt: null },
          select: { slug: true, title: true },
        })
      : null;

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <div className="space-y-2">
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">AI tutor</h1>
        <p className="text-muted">
          A tutor that adapts to your level, gives hints before answers and explains your mistakes.
        </p>
      </div>

      {configured ? (
        <section aria-labelledby="new-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
          <h2 id="new-heading" className="text-ink mb-4 text-lg font-semibold">
            New conversation
          </h2>
          <div className="mb-5">
            <AiHonestyNote sharing={prefs.aiContextSharing} />
          </div>
          <TutorChat
            conversation={null}
            initialMode={isTutorMode(params.mode) ? params.mode : "explain"}
            defaultStyle={prefs.explanationStyle}
            lesson={lesson}
          />
        </section>
      ) : (
        <TutorSetupNotice />
      )}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-ink mb-2 text-lg font-semibold">
          Your conversations
        </h2>
        <ConversationList conversations={conversations} />
      </section>
    </Container>
  );
}
