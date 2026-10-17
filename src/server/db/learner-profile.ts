import "server-only";
import type { CefrLevel, LearningPreferences, Profile } from "@/generated/prisma/client";
import type { OnboardingInput, PreferencesUpdateInput, ProfileUpdateInput } from "@/lib/validation/profile";
import { prisma } from "./client";

/*
 * Learner profile repository.
 * Every function takes the userId of the signed-in learner (from requireUser())
 * as its first argument and scopes every query to it. No function accepts a
 * profile or preferences id, so one learner cannot address another's records.
 */

export type PreferencesView = Pick<
  LearningPreferences,
  | "dailyMinutes"
  | "explanationStyle"
  | "translationSupport"
  | "textScale"
  | "reducedMotion"
  | "gamificationEnabled"
  | "tutorHintMode"
  | "aiContextSharing"
>;

export const DEFAULT_PREFERENCES: PreferencesView = {
  dailyMinutes: 20,
  explanationStyle: "concise",
  translationSupport: true,
  textScale: "normal",
  reducedMotion: false,
  gamificationEnabled: true,
  tutorHintMode: "hint_first",
  aiContextSharing: false,
};

export async function getProfile(userId: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { userId } });
}

export async function getPreferences(userId: string): Promise<PreferencesView> {
  const prefs = await prisma.learningPreferences.findUnique({ where: { userId } });
  if (!prefs) return DEFAULT_PREFERENCES;
  const {
    dailyMinutes,
    explanationStyle,
    translationSupport,
    textScale,
    reducedMotion,
    gamificationEnabled,
    tutorHintMode,
    aiContextSharing,
  } = prefs;
  return {
    dailyMinutes,
    explanationStyle,
    translationSupport,
    textScale,
    reducedMotion,
    gamificationEnabled,
    tutorHintMode,
    aiContextSharing,
  };
}

export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<void> {
  const level: CefrLevel | null = input.selfReportedLevel === "unsure" ? null : input.selfReportedLevel;
  const profileData = {
    displayName: input.displayName,
    goals: input.goals,
    nativeLanguage: input.nativeLanguage,
    timezone: input.timezone,
    selfReportedLevel: level,
    // A self-reported level is only a starting estimate and is labelled as such.
    estimatedLevel: level,
    levelSource: level ? ("self_reported" as const) : null,
    onboardingCompletedAt: new Date(),
  };
  const prefsData = { dailyMinutes: input.dailyMinutes, explanationStyle: input.explanationStyle };

  await prisma.$transaction([
    prisma.profile.upsert({ where: { userId }, create: { userId, ...profileData }, update: profileData }),
    prisma.learningPreferences.upsert({ where: { userId }, create: { userId, ...prefsData }, update: prefsData }),
    prisma.user.update({ where: { id: userId }, data: { name: input.displayName } }),
  ]);
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  const data = {
    displayName: input.displayName,
    goals: input.goals,
    nativeLanguage: input.nativeLanguage,
    timezone: input.timezone,
  };
  await prisma.$transaction([
    prisma.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data }),
    prisma.user.update({ where: { id: userId }, data: { name: input.displayName } }),
  ]);
}

export async function updatePreferences(userId: string, input: PreferencesUpdateInput): Promise<void> {
  await prisma.learningPreferences.upsert({ where: { userId }, create: { userId, ...input }, update: input });
}
