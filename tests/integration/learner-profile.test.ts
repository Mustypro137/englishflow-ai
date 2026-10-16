import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  completeOnboarding,
  DEFAULT_PREFERENCES,
  getPreferences,
  getProfile,
  updatePreferences,
  updateProfile,
} from "@/server/db/learner-profile";
import type { OnboardingInput } from "@/lib/validation/profile";

async function createUser(name: string) {
  return prisma.user.create({
    data: { id: randomUUID(), name, email: `${randomUUID()}@profile.example.test`, emailVerified: true },
  });
}

const onboarding = (overrides: Partial<OnboardingInput> = {}): OnboardingInput => ({
  displayName: "Learner",
  goals: ["work"],
  nativeLanguage: null,
  selfReportedLevel: "A2",
  dailyMinutes: 20,
  explanationStyle: "concise",
  timezone: "Europe/London",
  ...overrides,
});

// Belt and braces: tests run in an isolated schema AND only ever delete their own test users.
const testUsers = { email: { endsWith: "@profile.example.test" } };

beforeEach(async () => {
  await prisma.user.deleteMany({ where: testUsers });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: testUsers });
  await prisma.$disconnect();
});

describe("learner profile repository", () => {
  it("returns default preferences and no profile for a brand-new learner", async () => {
    const user = await createUser("New");
    expect(await getProfile(user.id)).toBeNull();
    expect(await getPreferences(user.id)).toEqual(DEFAULT_PREFERENCES);
  });

  it("saves onboarding answers and marks the self-reported level as such", async () => {
    const user = await createUser("Ada");
    await completeOnboarding(
      user.id,
      onboarding({ displayName: "Ada L.", dailyMinutes: 30, goals: ["work", "travel"] }),
    );

    const profile = await getProfile(user.id);
    expect(profile).toMatchObject({
      displayName: "Ada L.",
      goals: ["work", "travel"],
      selfReportedLevel: "A2",
      estimatedLevel: "A2",
      levelSource: "self_reported",
      timezone: "Europe/London",
    });
    expect(profile?.onboardingCompletedAt).toBeInstanceOf(Date);
    expect((await getPreferences(user.id)).dailyMinutes).toBe(30);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.name).toBe("Ada L.");
  });

  it("stores no level when the learner is unsure", async () => {
    const user = await createUser("Unsure");
    await completeOnboarding(user.id, onboarding({ selfReportedLevel: "unsure" }));
    expect(await getProfile(user.id)).toMatchObject({
      selfReportedLevel: null,
      estimatedLevel: null,
      levelSource: null,
    });
  });

  it("updates profile and preferences", async () => {
    const user = await createUser("Ben");
    await completeOnboarding(user.id, onboarding());
    await updateProfile(user.id, {
      displayName: "Benjamin",
      goals: [],
      nativeLanguage: "Yoruba",
      timezone: "Africa/Lagos",
    });
    await updatePreferences(user.id, {
      dailyMinutes: 60,
      explanationStyle: "detailed",
      translationSupport: false,
      textScale: "x_large",
      reducedMotion: true,
    });
    expect(await getProfile(user.id)).toMatchObject({ displayName: "Benjamin", nativeLanguage: "Yoruba", goals: [] });
    expect(await getPreferences(user.id)).toEqual({
      dailyMinutes: 60,
      explanationStyle: "detailed",
      translationSupport: false,
      textScale: "x_large",
      reducedMotion: true,
    });
  });
});

describe("learner data isolation", () => {
  it("never reads or changes another learner's records", async () => {
    const a = await createUser("A");
    const b = await createUser("B");
    await completeOnboarding(a.id, onboarding({ displayName: "Learner A", timezone: "Asia/Tokyo" }));
    await completeOnboarding(b.id, onboarding({ displayName: "Learner B", timezone: "America/New_York" }));

    await updateProfile(a.id, { displayName: "A changed", goals: ["study"], nativeLanguage: null, timezone: "UTC" });
    await updatePreferences(a.id, {
      dailyMinutes: 10,
      explanationStyle: "detailed",
      translationSupport: false,
      textScale: "large",
      reducedMotion: true,
    });

    expect((await getProfile(a.id))?.displayName).toBe("A changed");
    expect(await getProfile(b.id)).toMatchObject({ displayName: "Learner B", timezone: "America/New_York" });
    expect(await getPreferences(b.id)).toMatchObject({ dailyMinutes: 20, textScale: "normal", reducedMotion: false });
  });

  it("deletes all of a learner's records when their account is deleted, and only theirs", async () => {
    const a = await createUser("A");
    const b = await createUser("B");
    await completeOnboarding(a.id, onboarding());
    await completeOnboarding(b.id, onboarding());

    await prisma.user.delete({ where: { id: a.id } });

    expect(await prisma.profile.count({ where: { userId: a.id } })).toBe(0);
    expect(await prisma.learningPreferences.count({ where: { userId: a.id } })).toBe(0);
    expect(await getProfile(b.id)).not.toBeNull();
  });
});
