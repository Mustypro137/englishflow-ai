/**
 * Activity summaries from real study events (answers, reviews). Pure functions.
 * Streaks are gentle: one missed day per week is forgiven, and nothing is ever
 * taken away or shamed — a broken streak simply starts again.
 */
import { localDateKey } from "./time";

const DAY = 86_400_000;

/** "YYYY-MM-DD" → day number since epoch (calendar arithmetic, no time zone). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}
function keyFromDayNumber(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

/** Monday of the week containing the given local date, as "YYYY-MM-DD". */
export function weekKey(dateKey: string): string {
  const n = dayNumber(dateKey);
  const weekday = (new Date(n * DAY).getUTCDay() + 6) % 7; // Monday = 0
  return keyFromDayNumber(n - weekday);
}

/** Count events per local day. */
export function countByDay(events: readonly Date[], timeZone: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    const k = localDateKey(e, timeZone);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** The last `days` local days (oldest first) with their counts, for a weekly chart. */
export function lastDays(byDay: Map<string, number>, now: Date, timeZone: string, days = 7) {
  const today = dayNumber(localDateKey(now, timeZone));
  return Array.from({ length: days }, (_, i) => {
    const key = keyFromDayNumber(today - (days - 1 - i));
    return { date: key, count: byDay.get(key) ?? 0 };
  });
}

export function daysStudiedThisWeek(byDay: Map<string, number>, now: Date, timeZone: string): number {
  const thisWeek = weekKey(localDateKey(now, timeZone));
  return [...byDay.entries()].filter(([k, n]) => n > 0 && weekKey(k) === thisWeek).length;
}

/**
 * Consecutive study days ending today (or yesterday, if today has no activity yet),
 * forgiving one missed day per calendar week.
 */
export function gentleStreak(byDay: Map<string, number>, now: Date, timeZone: string): number {
  const today = dayNumber(localDateKey(now, timeZone));
  const graceUsed = new Set<string>();
  let streak = 0;
  let previousMissed = false;
  for (let n = today; n > today - 400; n--) {
    const key = keyFromDayNumber(n);
    if ((byDay.get(key) ?? 0) > 0) {
      streak += 1;
      previousMissed = false;
      continue;
    }
    if (n === today) continue; // today isn't over yet
    // One missed day per week is forgiven — including yesterday, so a single
    // missed day never wipes out a streak. Two missed days in a row end it.
    const wk = weekKey(key);
    if (!previousMissed && !graceUsed.has(wk)) {
      graceUsed.add(wk);
      previousMissed = true;
      continue;
    }
    break;
  }
  return streak;
}

/** Points that reward quality: independent correct answers count most. */
export function learningPoints(c: {
  independentCorrect: number;
  helpedCorrect: number;
  reviewsRemembered: number;
  challengesCompleted: number;
}): number {
  return c.independentCorrect * 2 + c.helpedCorrect + c.reviewsRemembered + c.challengesCompleted * 10;
}
