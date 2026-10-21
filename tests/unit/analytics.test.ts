import { describe, expect, it } from "vitest";
import {
  type AnalyticsInput,
  type AnswerRecord,
  buildAnalytics,
  type ConceptRecord,
  MIN_SAMPLE,
  rate,
  recentWeeks,
  type ReviewRecord,
} from "@/lib/learning/analytics";

// Wednesday 15 October 2026, midday UTC.
const NOW = new Date("2026-10-15T12:00:00Z");
const daysAgo = (n: number, hour = 12) => new Date(NOW.getTime() - n * 86_400_000 + (hour - 12) * 3_600_000);

const answer = (over: Partial<AnswerRecord> = {}): AnswerRecord => ({
  at: daysAgo(1),
  skill: "grammar",
  correct: true,
  independent: true,
  inReview: false,
  ...over,
});
const review = (over: Partial<ReviewRecord> = {}): ReviewRecord => ({
  at: daysAgo(1),
  rating: "good",
  previousState: "review",
  ...over,
});
const concept = (over: Partial<ConceptRecord> = {}): ConceptRecord => ({
  slug: "be",
  name: "To be",
  skill: "grammar",
  levelCode: "A1",
  state: "learning",
  attempts: 0,
  correct: 0,
  recentOutcomes: [],
  lastPracticedAt: null,
  ...over,
});
const input = (over: Partial<AnalyticsInput> = {}): AnalyticsInput => ({
  now: NOW,
  timeZone: "UTC",
  answers: [],
  reviews: [],
  practice: [],
  concepts: [],
  ...over,
});
const times = <T>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));

describe("rate", () => {
  it("reports nothing until there is enough evidence", () => {
    expect(rate(1, 1)).toEqual({ value: null, count: 1 });
    expect(rate(MIN_SAMPLE - 1, MIN_SAMPLE - 1).value).toBeNull();
    expect(rate(3, MIN_SAMPLE).value).toBeCloseTo(3 / MIN_SAMPLE);
  });
});

describe("buildAnalytics", () => {
  it("is empty, not zero, for a learner with no records", () => {
    const a = buildAnalytics(input());
    expect(a.hasData).toBe(false);
    expect(a.skills).toEqual([]);
    expect(a.concepts).toEqual([]);
    expect(a.retention.remembered.value).toBeNull();
    expect(a.activity.weeks).toHaveLength(12);
    expect(a.activity.weeks.every((w) => w.answers === 0 && w.studyDays === 0)).toBe(true);
  });

  it("computes per-skill accuracy overall and for the last 30 days", () => {
    const answers = [
      ...times(6, (i) => answer({ at: daysAgo(40), correct: i < 2 })), // old: 2 of 6
      ...times(6, () => answer({ at: daysAgo(3) })), // recent: 6 of 6
      ...times(2, () => answer({ skill: "reading" })),
    ];
    const a = buildAnalytics(input({ answers }));
    const grammar = a.skills.find((s) => s.skill === "grammar")!;
    expect(grammar.answers).toBe(12);
    expect(grammar.accuracy.value).toBeCloseTo(8 / 12);
    expect(grammar.recentAccuracy).toEqual({ value: 1, count: 6 });
    const reading = a.skills.find((s) => s.skill === "reading")!;
    expect(reading.accuracy).toEqual({ value: null, count: 2 });
  });

  it("measures how many correct answers came without help", () => {
    const answers = [
      ...times(4, () => answer()),
      answer({ independent: false }),
      answer({ independent: false, correct: false }),
    ];
    const grammar = buildAnalytics(input({ answers })).skills[0];
    // 5 correct answers, 4 of them without hints or a revealed answer.
    expect(grammar.independentShare).toEqual({ value: 4 / 5, count: 5 });
  });

  it("keeps skills in a fixed order and includes mastery counts and practice-only skills", () => {
    const a = buildAnalytics(
      input({
        answers: [answer({ skill: "reading" })],
        practice: [{ at: daysAgo(2), skill: "pronunciation" }],
        concepts: [concept({ state: "mastered" }), concept({ slug: "have", state: "new" })],
      }),
    );
    expect(a.skills.map((s) => s.skill)).toEqual(["grammar", "reading", "pronunciation"]);
    expect(a.skills[0].mastery).toEqual({ new: 1, learning: 0, practicing: 0, mastered: 1 });
    expect(a.skills[2]).toMatchObject({ answers: 0, practiceSessions: 1 });
    expect(a.skills[2].accuracy.value).toBeNull();
  });

  it("lists practised concepts only, weakest first, and flags low recent accuracy", () => {
    const a = buildAnalytics(
      input({
        concepts: [
          concept({ slug: "unseen", name: "Unseen" }),
          concept({ slug: "ok", name: "Strong", attempts: 8, correct: 8, recentOutcomes: times(8, () => true) }),
          concept({
            slug: "weak",
            name: "Weak",
            attempts: 6,
            correct: 2,
            recentOutcomes: [true, false, false, true, false, false],
          }),
          concept({ slug: "few", name: "Few", attempts: 2, correct: 0, recentOutcomes: [false, false] }),
        ],
      }),
    );
    expect(a.concepts.map((c) => c.slug)).toEqual(["weak", "ok", "few"]);
    expect(a.concepts[0]).toMatchObject({ needsAttention: true });
    expect(a.concepts[0].recentAccuracy.value).toBeCloseTo(2 / 6);
    // Two wrong answers aren't enough evidence to call a concept weak.
    expect(a.concepts[2]).toMatchObject({ needsAttention: false, recentAccuracy: { value: null } });
  });

  it("separates retention of mature cards from cards still being learned", () => {
    const reviews = [
      ...times(8, (i) => review({ rating: i < 6 ? "good" : "again" })),
      ...times(5, (i) =>
        review({ previousState: i < 3 ? "learning" : "relearning", rating: i < 2 ? "again" : "hard" }),
      ),
    ];
    const r = buildAnalytics(input({ reviews })).retention;
    expect(r.reviews).toBe(13);
    expect(r.mature).toEqual({ value: 6 / 8, count: 8 });
    expect(r.young).toEqual({ value: 3 / 5, count: 5 });
    expect(r.remembered.value).toBeCloseTo(9 / 13);
  });

  it("gives weekly retention for the last 8 weeks, current week last", () => {
    const reviews = [...times(5, () => review({ at: daysAgo(1) })), review({ at: daysAgo(70) })];
    const { weeks } = buildAnalytics(input({ reviews })).retention;
    expect(weeks).toHaveLength(8);
    expect(weeks[7]).toEqual({ week: "2026-10-12", reviews: 5, remembered: { value: 1, count: 5 } });
    expect(weeks.slice(0, 7).every((w) => w.reviews === 0)).toBe(true);
  });

  it("counts activity per local week and study days without double-counting reviews", () => {
    const a = buildAnalytics(
      input({
        answers: [
          answer({ at: daysAgo(0) }),
          answer({ at: daysAgo(0) }),
          answer({ at: daysAgo(1), inReview: true }), // same event as the review below
          answer({ at: daysAgo(10) }),
        ],
        reviews: [review({ at: daysAgo(1) })],
        practice: [{ at: daysAgo(2), skill: "listening" }],
      }),
    );
    const current = a.activity.weeks.at(-1)!;
    expect(current).toEqual({ week: "2026-10-12", answers: 2, reviews: 1, practice: 1, studyDays: 3 });
    expect(a.activity.weeks.at(-2)).toMatchObject({ week: "2026-10-05", answers: 1, studyDays: 1 });
    expect(a.activity).toMatchObject({ studyDaysLast30: 4, totalStudyDays: 4, firstStudyDay: "2026-10-05" });
  });

  it("uses the learner's time zone for days and weeks", () => {
    // Sunday 11 October, 23:30 UTC is already Monday 12 October in Tokyo.
    const at = new Date("2026-10-11T23:30:00Z");
    const utc = buildAnalytics(input({ answers: [answer({ at })] }));
    const tokyo = buildAnalytics(input({ answers: [answer({ at })], timeZone: "Asia/Tokyo" }));
    expect(utc.activity.weeks.at(-2)!.answers).toBe(1);
    expect(tokyo.activity.weeks.at(-1)!.answers).toBe(1);
    expect(tokyo.activity.firstStudyDay).toBe("2026-10-12");
  });
});

describe("recentWeeks", () => {
  it("returns Mondays, oldest first", () => {
    expect(recentWeeks(NOW, "UTC", 3)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
  });
});
