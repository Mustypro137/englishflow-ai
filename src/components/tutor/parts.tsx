import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { TUTOR_MODE_INFO } from "@/lib/ai/modes";
import type { ConversationSummary } from "@/server/db/tutor";

/** Shown instead of the tutor when no AI provider is configured. Nothing pretends to work. */
export function TutorSetupNotice({ feature = "The AI tutor" }: { feature?: string }) {
  return (
    <Alert tone="warning" title={`${feature} isn't set up on this site yet`}>
      <p>
        No AI provider is configured, so nothing is generated and nothing is sent anywhere. Your lessons, reviews,
        practice, mistakes and notebook all work without it.
      </p>
      <p className="mt-2">
        Site owners: set <code>AI_PROVIDER=anthropic</code> and <code>ANTHROPIC_API_KEY</code> on the server (see{" "}
        <code>.env.example</code>), then redeploy.
      </p>
    </Alert>
  );
}

export function AiHonestyNote({ sharing }: { sharing: boolean }) {
  return (
    <p className="text-muted text-sm">
      Replies come from an AI model. It can make mistakes, so check important points against your lessons.{" "}
      {sharing
        ? "The tutor can see a short summary of your learning history."
        : "The tutor can't see your learning history."}{" "}
      <Link href="/app/settings#preferences" className="text-primary font-medium underline">
        Change in settings
      </Link>
      {" · "}
      <Link href="/app/settings/memory" className="text-primary font-medium underline">
        Saved learning context
      </Link>
    </p>
  );
}

export function ConversationList({
  conversations,
  currentId,
}: {
  conversations: ConversationSummary[];
  currentId?: string;
}) {
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  if (conversations.length === 0) return <p className="text-muted text-sm">No conversations yet.</p>;
  return (
    <ul className="divide-border divide-y text-sm">
      {conversations.map((c) => (
        <li key={c.id} className="py-2">
          <Link
            href={`/app/tutor/${c.id}`}
            aria-current={c.id === currentId ? "page" : undefined}
            className="text-ink hover:text-primary block font-medium aria-[current=page]:underline"
          >
            {c.title}
          </Link>
          <span className="text-muted text-xs">
            {TUTOR_MODE_INFO[c.mode].label} · {date.format(c.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
