import { describe, expect, it } from "vitest";
import {
  cardAfterLesson,
  newCard,
  ratingFromAnswer,
  schedule,
  SRS_CONFIG,
  type SrsCard,
} from "@/lib/learning/srs/scheduler";
import { describeDue, endOfLocalDay, localDateKey, localDaysBetween } from "@/lib/learning/time";

const now = new Date("2026-10-16T12:00:00Z");
const MIN = 60_000;
const DAY = 86_400_000;
const daysUntil = (c: SrsCard, from = now) => Math.round((c.dueAt.getTime() - from.getTime()) / DAY);

function reviewCard(intervalDays: number, ease = 2.5): SrsCard {
  return { state: "review", step: 0, ease, intervalDays, reps: 3, lapses: 0, dueAt: now };
}

describe("learning steps", () => {
  it("a new item is not treated as learned: Good moves to the next step, not to long intervals", () => {
    const c = schedule(newCard(now), "good", now);
    expect(c).toMatchObject({ state: "learning", step: 1 });
    expect(c.dueAt.getTime() - now.getTime()).toBe(SRS_CONFIG.learningStepsMinutes[1] * MIN);
  });

  it("Again sends a new item back to the first short step", () => {
    const c = schedule(schedule(newCard(now), "good", now), "again", now);
    expect(c).toMatchObject({ state: "learning", step: 0 });
    expect(c.dueAt.getTime() - now.getTime()).toBe(10 * MIN);
  });

  it("finishing the steps graduates the item to a 1-day interval", () => {
    const c = schedule(cardAfterLesson(now), "good", now);
    expect(c).toMatchObject({ state: "review", intervalDays: 1 });
    expect(daysUntil(c)).toBe(1);
  });

  it("Easy graduates immediately with a longer interval", () => {
    const c = schedule(newCard(now), "easy", now);
    expect(c).toMatchObject({ state: "review", intervalDays: SRS_CONFIG.easyIntervalDays });
  });

  it("a lesson exercise's first review is a delayed one, the next day", () => {
    expect(daysUntil(cardAfterLesson(now))).toBe(1);
  });
});

describe("review intervals", () => {
  it("repeated Good answers lengthen the interval", () => {
    let c = schedule(cardAfterLesson(now), "good", now); // 1 day
    const intervals = [c.intervalDays];
    for (let i = 0; i < 4; i++) {
      c = schedule(c, "good", c.dueAt, "item");
      intervals.push(c.intervalDays);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    expect(intervals[0]).toBe(1);
    expect(intervals[4]).toBeGreaterThanOrEqual(30);
  });

  it("Easy lengthens more than Good, and Hard less", () => {
    const base = reviewCard(10);
    const hard = schedule(base, "hard", now, "s").intervalDays;
    const good = schedule(base, "good", now, "s").intervalDays;
    const easy = schedule(base, "easy", now, "s").intervalDays;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("Again shortens: the item is relearned within minutes and restarts at a short interval", () => {
    const lapsed = schedule(reviewCard(20), "again", now);
    expect(lapsed).toMatchObject({ state: "relearning", lapses: 1, intervalDays: 1 });
    expect(lapsed.dueAt.getTime() - now.getTime()).toBe(10 * MIN);
    expect(lapsed.ease).toBeCloseTo(2.3);
    const relearned = schedule(lapsed, "good", lapsed.dueAt);
    expect(relearned).toMatchObject({ state: "review", intervalDays: 1 });
  });

  it("keeps ease within bounds", () => {
    let c = reviewCard(5, SRS_CONFIG.minEase);
    c = schedule(c, "again", now);
    expect(c.ease).toBe(SRS_CONFIG.minEase);
    let e = reviewCard(5, SRS_CONFIG.maxEase);
    e = schedule(e, "easy", now);
    expect(e.ease).toBe(SRS_CONFIG.maxEase);
  });

  it("never exceeds the maximum interval", () => {
    expect(schedule(reviewCard(300), "easy", now).intervalDays).toBeLessThanOrEqual(SRS_CONFIG.maxIntervalDays);
  });

  it("keeps short intervals exact", () => {
    expect(schedule(reviewCard(4), "good", now, "any").intervalDays).toBe(10);
  });

  it("fuzz is deterministic for the same item and stays within 5%", () => {
    const a = schedule(reviewCard(40), "good", now, "item-1");
    const b = schedule(reviewCard(40), "good", now, "item-1");
    expect(a.intervalDays).toBe(b.intervalDays);
    expect(Math.abs(a.intervalDays - 100)).toBeLessThanOrEqual(5);
  });
});

describe("ratingFromAnswer", () => {
  it("maps graded answers to ratings", () => {
    expect(ratingFromAnswer(false, false)).toBe("again");
    expect(ratingFromAnswer(true, true)).toBe("hard");
    expect(ratingFromAnswer(true, false)).toBe("good");
  });
});

describe("time zones", () => {
  it("uses the learner's local day, not UTC", () => {
    const lateEvening = new Date("2026-10-16T22:30:00Z"); // 23:30 in Lagos (UTC+1)
    expect(localDateKey(lateEvening, "Africa/Lagos")).toBe("2026-10-16");
    expect(localDateKey(lateEvening, "Asia/Tokyo")).toBe("2026-10-17");
    expect(endOfLocalDay(lateEvening, "Africa/Lagos").toISOString()).toBe("2026-10-16T23:00:00.000Z");
  });

  it("handles the day clocks go forward (New York, 8 March 2026: a 23-hour day)", () => {
    const morning = new Date("2026-03-08T15:00:00Z"); // 11:00 EDT
    expect(endOfLocalDay(morning, "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    // 01:30 EST on 8 March, before the clocks jump at 02:00: the day still ends at midnight EDT.
    expect(endOfLocalDay(new Date("2026-03-08T06:30:00Z"), "America/New_York").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
    // 23:30 EST on 7 March belongs to the previous day.
    expect(endOfLocalDay(new Date("2026-03-08T04:30:00Z"), "America/New_York").toISOString()).toBe(
      "2026-03-08T05:00:00.000Z",
    );
  });

  it("handles the day clocks go back (London, 25 October 2026: a 25-hour day)", () => {
    const noon = new Date("2026-10-25T12:00:00Z");
    expect(endOfLocalDay(noon, "Europe/London").toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(localDateKey(new Date("2026-10-24T23:30:00Z"), "Europe/London")).toBe("2026-10-25");
  });

  it("counts local days between dates", () => {
    expect(localDaysBetween(now, new Date(now.getTime() + DAY), "UTC")).toBe(1);
    expect(localDaysBetween(new Date("2026-10-16T22:00:00Z"), new Date("2026-10-16T23:30:00Z"), "Africa/Lagos")).toBe(
      1,
    );
  });

  it("describes when an item is next due", () => {
    expect(describeDue(now, now, "UTC")).toBe("now");
    expect(describeDue(new Date(now.getTime() + 10 * MIN), now, "UTC")).toBe("in 10 min");
    expect(describeDue(new Date(now.getTime() + DAY), now, "UTC")).toBe("tomorrow");
    expect(describeDue(new Date(now.getTime() + 3 * DAY), now, "UTC")).toBe("in 3 days");
    expect(describeDue(new Date(now.getTime() + 20 * DAY), now, "UTC")).toBe("in 20 days (5 Nov)");
  });
});

describe("startOfLocalDate", () => {
  it("returns local midnight in UTC, including across daylight-saving changes", async () => {
    const { startOfLocalDate } = await import("@/lib/learning/time");
    expect(startOfLocalDate("2026-10-20", "Africa/Lagos").toISOString()).toBe("2026-10-19T23:00:00.000Z");
    expect(startOfLocalDate("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(startOfLocalDate("2026-10-26", "Europe/London").toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});
