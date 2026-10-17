import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getPreferences, getProfile } from "@/server/db/learner-profile";
import { DeleteAccount } from "./delete-account";
import { PreferencesForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, prefs] = await Promise.all([getProfile(user.id), getPreferences(user.id)]);
  if (!profile) redirect("/app/onboarding");

  return (
    <Container width="narrow" className="space-y-10 py-10">
      <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>

      <Section id="profile" title="Profile">
        <ProfileForm
          defaults={{
            displayName: profile.displayName,
            nativeLanguage: profile.nativeLanguage ?? "",
            timezone: profile.timezone,
            goals: profile.goals,
          }}
        />
      </Section>

      <Section id="preferences" title="Learning and accessibility">
        <PreferencesForm defaults={prefs} />
      </Section>

      <Section id="tutor" title="AI tutor memory">
        <p className="text-muted text-sm">
          Notes the tutor may use, such as how you like to learn. AI suggestions are only used after you confirm them.
        </p>
        <Link href="/app/settings/memory" className="text-primary text-sm font-medium underline">
          Manage saved learning context
        </Link>
      </Section>

      <Section id="account" title="Account">
        <dl className="text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="text-ink mt-1 font-medium">{user.email}</dd>
        </dl>
        <DeleteAccount />
      </Section>
    </Container>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="border-border bg-surface rounded-lg border p-5 sm:p-6">
      <h2 id={`${id}-heading`} className="text-ink text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}
