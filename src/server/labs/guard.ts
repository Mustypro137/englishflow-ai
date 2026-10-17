import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getProfile } from "@/server/db/learner-profile";

/** The signed-in learner and their profile; sends them to onboarding first if needed. */
export async function requireLearner() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  return { user, profile };
}
