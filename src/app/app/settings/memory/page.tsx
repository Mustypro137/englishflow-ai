import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getPreferences, getProfile } from "@/server/db/learner-profile";
import { listMemories } from "@/server/db/memory";
import { MemoryForm, MemoryItem } from "./memory-forms";

export const metadata: Metadata = { title: "Saved learning context" };

export default async function MemoryPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const [memories, prefs] = await Promise.all([listMemories(user.id), getPreferences(user.id)]);
  const suggested = memories.filter((m) => !m.verified);
  const confirmed = memories.filter((m) => m.verified);

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <Link href="/app/settings" className="text-primary inline-flex items-center gap-1 text-sm font-medium underline">
        <ArrowLeft aria-hidden className="size-4" /> Settings
      </Link>
      <div className="space-y-2">
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Saved learning context</h1>
        <p className="text-muted">
          Short notes the AI tutor may use, such as how you like to learn or mistakes you often make. They are kept
          separately from your conversations. You can edit or delete any of them.
        </p>
        <p className="text-muted text-sm">
          {prefs.aiContextSharing
            ? "Learning history sharing is on, so the tutor sees your confirmed notes."
            : "Learning history sharing is off, so the tutor doesn't see these notes."}{" "}
          <Link href="/app/settings#preferences" className="text-primary font-medium underline">
            Change in settings
          </Link>
        </p>
      </div>

      {suggested.length > 0 ? (
        <section aria-labelledby="suggested-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
          <h2 id="suggested-heading" className="text-ink text-lg font-semibold">
            Suggestions to check ({suggested.length})
          </h2>
          <p className="text-muted mt-1 text-sm">
            The AI suggested these from your conversations. They may be wrong, so the tutor ignores them until you
            confirm them.
          </p>
          <ul className="divide-border mt-4 divide-y">
            {suggested.map((m) => (
              <li key={m.id} className="py-4 first:pt-0 last:pb-0">
                <MemoryItem memory={m} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="confirmed-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <h2 id="confirmed-heading" className="text-ink text-lg font-semibold">
          Your notes
        </h2>
        {confirmed.length > 0 ? (
          <ul className="divide-border mt-4 divide-y">
            {confirmed.map((m) => (
              <li key={m.id} className="py-4 first:pt-0 last:pb-0">
                <MemoryItem memory={m} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-2 text-sm">No notes yet. Add one below, or ask the tutor to suggest some.</p>
        )}
      </section>

      <section aria-labelledby="add-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <h2 id="add-heading" className="text-ink mb-4 text-lg font-semibold">
          Add a note
        </h2>
        <MemoryForm />
      </section>
    </Container>
  );
}
