/**
 * Time-zone helpers. All timestamps are stored in UTC; "today" is always the
 * learner's local day in their IANA time zone (e.g. "Africa/Lagos").
 */

function partsInZone(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Offset of the zone from UTC at a given instant, in milliseconds (e.g. +1h for Lagos). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = partsInZone(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight at the start of the given local calendar date. */
function localMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  // Two passes handle days on which the offset changes (daylight saving).
  let instant = guess - zoneOffsetMs(new Date(guess), timeZone);
  instant = guess - zoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** Local calendar date as "YYYY-MM-DD" — used to tell whether two events happened on different days. */
export function localDateKey(instant: Date, timeZone: string): string {
  const p = partsInZone(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The instant the learner's current local day ends (= next local midnight), in UTC. */
export function endOfLocalDay(instant: Date, timeZone: string): Date {
  const p = partsInZone(instant, timeZone);
  return localMidnight(p.year, p.month, p.day + 1, timeZone);
}

/** Whole local days from `from` to `to` (0 = same local day, 1 = tomorrow, …). */
export function localDaysBetween(from: Date, to: Date, timeZone: string): number {
  const a = localDateKey(from, timeZone).split("-").map(Number);
  const b = localDateKey(to, timeZone).split("-").map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

/** A friendly description of when something is next due, relative to now. */
export function describeDue(due: Date, now: Date, timeZone: string): string {
  if (due.getTime() <= now.getTime()) return "now";
  const days = localDaysBetween(now, due, timeZone);
  if (days === 0) {
    const minutes = Math.round((due.getTime() - now.getTime()) / 60_000);
    return minutes < 60 ? `in ${Math.max(1, minutes)} min` : "later today";
  }
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  const date = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(due);
  return `in ${days} days (${date})`;
}
