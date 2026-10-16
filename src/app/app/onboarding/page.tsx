import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/db/learner-profile";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your learning" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile?.onboardingCompletedAt) redirect("/app");

  return (
    <Container width="narrow" className="py-10">
      <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Set up your learning</h1>
      <p className="text-muted mt-2">
        A few questions so EnglishFlow can start at the right place. You can change any answer later in Settings.
      </p>
      <OnboardingForm defaultName={user.name} />
    </Container>
  );
}
