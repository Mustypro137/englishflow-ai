import { describe, expect, it } from "vitest";
import { CHALLENGES } from "@content/challenges";
import { deriveAchievements } from "@/lib/learning/achievements";
import {
  countByDay,
  daysStudiedThisWeek,
  gentleStreak,
  lastDays,
  learningPoints,
  weekKey,
} from "@/lib/learning/activity";
import {
  activeChallenges,
  challengePeriods,
  challengeProgress,
  countSentences,
  type PeriodActivity,
} from "@/lib/learning/challenges";

const at = (iso: string) => new Date(iso);
const byDayOf = (days: string[]) =>
  countByDay(
    days.map((d) => at(`${d}T12:00:00Z`)),
    "UTC",
  );
// Tuesday 20 October 2026, noon UTC
const now = at("2026-10-20T12:00:00Z");

describe("activity", () => {
  it("finds the Monday of a week", () => {
    expect(weekKey("2026-10-20")).toBe("2026-10-19"); // Tuesday → Monday
    expect(weekKey("2026-10-25")).toBe("2026-10-19"); // Sunday → same Monday
    expect(weekKey("2026-10-26")).toBe("2026-10-26"); // Monday
  });

  it("counts per local day, using the learner's time zone", () => {
    const late = [at("2026-10-19T23:30:00Z")];
    expect([...countByDay(late, "UTC").keys()]).toEqual(["2026-10-19"]);
    expect([...countByDay(late, "Africa/Lagos").keys()]).toEqual(["2026-10-20"]);
  });

  it("builds a 7-day chart ending today, including empty days", () => {
    const days = lastDays(byDayOf(["2026-10-20", "2026-10-20", "2026-10-17"]), now, "UTC");
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toEqual({ date: "2026-10-20", count: 2 });
    expect(days.find((d) => d.date === "2026-10-17")?.count).toBe(1);
    expect(days.find((d) => d.date === "2026-10-18")?.count).toBe(0);
  });

  it("counts different study days this week only", () => {
    expect(daysStudiedThisWeek(byDayOf(["2026-10-18", "2026-10-19", "2026-10-20"]), now, "UTC")).toBe(2);
  });

  it("keeps a streak through one missed day a week, and doesn't break before today is over", () => {
    // Studied Thu–Sun, missed Mon, studied... today (Tue) nothing yet.
    const s = byDayOf(["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(gentleStreak(s, now, "UTC")).toBe(4);
    // Two missed days in the same week break it.
    const broken = byDayOf(["2026-10-12", "2026-10-15", "2026-10-20"]);
    expect(gentleStreak(broken, now, "UTC")).toBe(1);
  });

  it("a single missed day just before today is forgiven too", () => {
    expect(gentleStreak(byDayOf(["2026-10-18"]), now, "UTC")).toBe(1); // studied Sunday, missed Monday
    expect(gentleStreak(byDayOf(["2026-10-17"]), now, "UTC")).toBe(0); // missed Sunday and Monday
  });

  it("starts at zero with no activity", () => {
    expect(gentleStreak(new Map(), now, "UTC")).toBe(0);
  });

  it("rewards independent answers most", () => {
    expect(
      learningPoints({ independentCorrect: 5, helpedCorrect: 5, reviewsRemembered: 3, challengesCompleted: 1 }),
    ).toBe(28);
  });
});

describe("challenges", () => {
  const none: PeriodActivity = {
    independentCorrect: 0,
    reviewsDone: 0,
    reviewsDueNow: 0,
    wordsRecalled: 0,
    mistakesFixed: 0,
    daysStudied: 0,
    lessonsCompleted: 0,
    conceptsMastered: 0,
    sentencesSubmitted: 0,
  };
  const find = (slug: string) => CHALLENGES.find((c) => c.slug === slug)!;

  it("picks two daily and one weekly challenge, stable within a period", () => {
    const p = challengePeriods(now, "UTC");
    expect(p).toEqual({ daily: "2026-10-20", weekly: "2026-10-19" });
    const a = activeChallenges(p);
    expect(a.map((x) => x.challenge.period)).toEqual(["daily", "daily", "weekly"]);
    expect(activeChallenges(p)).toEqual(a);
    expect(new Set(a.map((x) => x.challenge.slug)).size).toBe(3);
    expect(a[0].challenge.slug).toBe("daily-five-sentences");
  });

  it("rotates the second daily challenge across days", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-11-${String(d).padStart(2, "0")}`;
      seen.add(activeChallenges({ daily: key, weekly: "2026-11-02" })[1].challenge.slug);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("measures progress and completion from real activity", () => {
    expect(challengeProgress(find("daily-ten-on-your-own"), { ...none, independentCorrect: 4 })).toEqual({
      current: 4,
      target: 10,
      completed: false,
    });
    expect(challengeProgress(find("daily-ten-on-your-own"), { ...none, independentCorrect: 12 })).toEqual({
      current: 10,
      target: 10,
      completed: true,
    });
  });

  it("clearing reviews needs at least one review and nothing left due", () => {
    const c = find("daily-clear-reviews");
    expect(challengeProgress(c, { ...none, reviewsDone: 0, reviewsDueNow: 0 }).completed).toBe(false);
    expect(challengeProgress(c, { ...none, reviewsDone: 5, reviewsDueNow: 2 }).completed).toBe(false);
    expect(challengeProgress(c, { ...none, reviewsDone: 5, reviewsDueNow: 0 }).completed).toBe(true);
  });

  it("counts only real sentences in writing", () => {
    expect(countSentences("Hi. I live in Lagos. My sister is a nurse!\nShe works at night")).toBe(3);
    expect(countSentences("ok ok. yes")).toBe(0);
  });
});

describe("achievements", () => {
  it("are derived only from things that happened, newest first", () => {
    const list = deriveAchievements({
      firstAnswerAt: at("2026-10-10T10:00:00Z"),
      lessonCompletions: [at("2026-10-12T10:00:00Z")],
      unitCompletions: [],
      firstReviewAt: at("2026-10-11T10:00:00Z"),
      masteredAt: [],
      studyDays: ["2026-10-10", "2026-10-11", "2026-10-12"],
      challengeCompletions: [],
    });
    expect(list.map((a) => a.id)).toEqual(["first-lesson", "first-review", "first-answer"]);
  });

  it("earns 'Steady learner' on the fifth study day and 'Five topics mastered' on the fifth", () => {
    const list = deriveAchievements({
      firstAnswerAt: null,
      lessonCompletions: [],
      unitCompletions: [],
      firstReviewAt: null,
      masteredAt: [1, 2, 3, 4, 5].map((d) => at(`2026-10-1${d}T10:00:00Z`)),
      studyDays: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"],
      challengeCompletions: [],
    });
    expect(list.find((a) => a.id === "five-days")?.earnedAt.toISOString()).toBe("2026-10-05T12:00:00.000Z");
    expect(list.find((a) => a.id === "five-mastered")?.earnedAt.toISOString()).toBe("2026-10-15T10:00:00.000Z");
  });
});
