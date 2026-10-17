import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TutorMarkdown } from "@/components/tutor/markdown";
import { AiHonestyNote, TutorSetupNotice } from "@/components/tutor/parts";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { isAiConfigured } from "@/server/ai/provider";
import { requireUser } from "@/server/auth/session";
import { getPreferences, getProfile } from "@/server/db/learner-profile";
import { getConversation } from "@/server/db/tutor";
import { deleteConversationAction } from "../actions";

export const metadata: Metadata = { title: "Tutor conversation" };

export default async function ConversationPage({ params }: PageProps<"/app/tutor/[id]">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const { id } = await params;
  const [conversation, prefs] = await Promise.all([getConversation(user.id, id), getPreferences(user.id)]);
  if (!conversation) notFound();
  const configured = isAiConfigured();

  return (
    <Container width="narrow" className="space-y-6 py-8 sm:py-10">
      <Link href="/app/tutor" className="text-primary inline-flex items-center gap-1 text-sm font-medium underline">
        <ArrowLeft aria-hidden className="size-4" /> All conversations
      </Link>
      <h1 className="text-ink text-2xl font-semibold tracking-tight break-words">{conversation.title}</h1>
      {configured ? (
        <>
          <AiHonestyNote sharing={prefs.aiContextSharing} />
          <TutorChat
            conversation={conversation}
            initialMode={conversation.mode}
            defaultStyle={prefs.explanationStyle}
            lesson={null}
          />
        </>
      ) : (
        <>
          <TutorSetupNotice />
          <ol aria-label="Conversation" className="space-y-4">
            {conversation.messages.map((m) => (
              <li key={m.id} className="border-border bg-surface rounded-lg border p-4 text-sm">
                <p className="text-muted mb-1.5 text-xs font-semibold uppercase">
                  {m.role === "user" ? "You" : "Tutor"}
                </p>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <TutorMarkdown text={m.content} />
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      <form action={deleteConversationAction} className="border-border border-t pt-6">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <Button type="submit" variant="secondary" size="sm">
          Delete this conversation
        </Button>
      </form>
    </Container>
  );
}
