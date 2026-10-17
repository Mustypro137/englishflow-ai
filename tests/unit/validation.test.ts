import { describe, expect, it } from "vitest";
import { safeAppRedirect, signUpSchema } from "@/lib/validation/auth";
import { isValidTimeZone, onboardingSchema, preferencesUpdateSchema } from "@/lib/validation/profile";

const validOnboarding = {
  displayName: "  Ada  ",
  goals: ["work", "travel", "work"],
  nativeLanguage: "",
  selfReportedLevel: "unsure",
  dailyMinutes: "20",
  explanationStyle: "concise",
  timezone: "Africa/Lagos",
};

describe("signUpSchema", () => {
  it("normalizes email and requires a long enough password", () => {
    const ok = signUpSchema.safeParse({ name: "Ada", email: "  Ada@Example.COM ", password: "a-long-passphrase" });
    expect(ok.success && ok.data.email).toBe("ada@example.com");
    expect(signUpSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "short" }).success).toBe(false);
  });

  it("rejects an invalid email and an empty name", () => {
    expect(signUpSchema.safeParse({ name: "Ada", email: "not-an-email", password: "a-long-passphrase" }).success).toBe(
      false,
    );
    expect(signUpSchema.safeParse({ name: "  ", email: "a@b.co", password: "a-long-passphrase" }).success).toBe(false);
  });
});

describe("safeAppRedirect", () => {
  it("allows paths inside the learner app", () => {
    expect(safeAppRedirect("/app/settings")).toBe("/app/settings");
  });

  it("blocks external and protocol-relative redirects", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/pricing", null, ""]) {
      expect(safeAppRedirect(bad)).toBe("/app");
    }
  });
});

describe("onboardingSchema", () => {
  it("accepts valid answers and cleans them up", () => {
    const result = onboardingSchema.parse(validOnboarding);
    expect(result.displayName).toBe("Ada");
    expect(result.goals).toEqual(["work", "travel"]);
    expect(result.nativeLanguage).toBeNull();
    expect(result.dailyMinutes).toBe(20);
  });

  it("rejects unknown goals, levels, styles and time zones", () => {
    for (const patch of [
      { goals: ["hacking"] },
      { selfReportedLevel: "D1" },
      { explanationStyle: "verbose" },
      { timezone: "Mars/Olympus_Mons" },
      { dailyMinutes: "0" },
      { dailyMinutes: "1000" },
    ]) {
      expect(onboardingSchema.safeParse({ ...validOnboarding, ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
  });
});

describe("preferencesUpdateSchema", () => {
  it("reads unchecked checkboxes as false and checked as true", () => {
    const result = preferencesUpdateSchema.parse({
      dailyMinutes: "30",
      explanationStyle: "detailed",
      textScale: "large",
      reducedMotion: "on",
      tutorHintMode: "guided",
    });
    expect(result).toEqual({
      dailyMinutes: 30,
      explanationStyle: "detailed",
      textScale: "large",
      translationSupport: false,
      reducedMotion: true,
      gamificationEnabled: false,
      tutorHintMode: "guided",
      aiContextSharing: false,
    });
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects nonsense", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
