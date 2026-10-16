import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { localDateKey } from "@/lib/learning/time";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { getCalendar } from "@/server/db/activity";
import { getProfile } from "@/server/db/learner-profile";

export const metadata: Metadata = { title: "Study calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const noonUtc = (date: string) => new Date(`${date}T12:00:00Z`);

function parseMonth(value: unknown, fallback: { year: number; month: number }) {
  const m = typeof value === "string" ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2020 || year > 2100 || month < 1 || month > 12) return fallback;
  return { year, month };
}

const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
function shift({ year, month }: { year: number; month: number }, by: number) {
  const d = new Date(Date.UTC(year, month - 1 + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export default async function CalendarPage({ searchParams }: PageProps<"/app/calendar">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardingCompletedAt) redirect("/app/onboarding");
  const now = new Date();
  const today = localDateKey(now, profile.timezone);
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const view = parseMonth((await searchParams).month, current);
  const isCurrent = view.year === current.year && view.month === current.month;
  const data = await getCalendar(user.id, view, now);

  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    noonUtc(`${monthKey(view.year, view.month)}-01`),
  );
  const fullDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const shortDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: data.timezone });
  const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: data.timezone });

  // Pad the grid so the 1st falls on the right weekday (Monday first).
  const firstWeekday = (noonUtc(data.month.days[0].date).getUTCDay() + 6) % 7;
  const cells: ({ date: string; count: number } | null)[] = [...Array(firstWeekday).fill(null), ...data.month.days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const studiedDays = data.month.days.filter((d) => d.count > 0).length;
  const maxLoad = Math.max(1, ...data.reviewLoad.map((d) => d.count));
  const prev = shift(view, -1);
  const next = shift(view, 1);

  return (
    <Container width="narrow" className="space-y-8 py-8 sm:py-10">
      <div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">Study calendar</h1>
        <p className="text-muted mt-2">
          The days you studied, the sessions you planned and how many reviews are coming up. Days follow your time zone
          ({data.timezone}).
        </p>
      </div>

      <section aria-labelledby="month-heading" className="border-border bg-surface rounded-lg border p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/app/calendar?month=${monthKey(prev.year, prev.month)}`}
            className={buttonClasses({ variant: "ghost", size: "icon" })}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden />
          </Link>
          <h2 id="month-heading" className="text-ink text-lg font-semibold">
            {monthName}
          </h2>
          {isCurrent ? (
            <span className="size-10" aria-hidden />
          ) : (
            <Link
              href={`/app/calendar?month=${monthKey(next.year, next.month)}`}
              className={buttonClasses({ variant: "ghost", size: "icon" })}
              aria-label="Next month"
            >
              <ChevronRight aria-hidden />
            </Link>
          )}
        </div>
        <p className="text-muted mt-1 text-center text-sm">
          {studiedDays} {studiedDays === 1 ? "day" : "days"} with study activity
        </p>
        <table className="mt-4 w-full table-fixed border-collapse text-center text-sm">
          <caption className="sr-only">Study activity in {monthName}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="text-muted pb-2 text-xs font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, ci) =>
                  cell ? (
                    <td key={cell.date} className="p-0.5">
                      <div
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-md",
                          cell.count > 0 ? "bg-primary text-on-primary" : "bg-sunken text-ink",
                          cell.date === today && "ring-ink ring-2",
                        )}
                      >
                        <span aria-hidden>{Number(cell.date.slice(8))}</span>
                        <span className="sr-only">
                          {fullDate.format(noonUtc(cell.date))}
                          {cell.date === today ? " (today)" : ""}:{" "}
                          {cell.count > 0 ? `studied, ${cell.count} answers and reviews` : "no study"}
                        </span>
                      </div>
                    </td>
                  ) : (
                    <td key={`empty-${ci}`} aria-hidden />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="load-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <h2 id="load-heading" className="text-ink text-lg font-semibold">
          Reviews coming up
        </h2>
        <p className="text-muted mt-1 text-sm">How many items fall due each day for the next two weeks.</p>
        {data.reviewLoad.every((d) => d.count === 0) ? (
          <p className="text-muted mt-4 text-sm">
            Nothing scheduled. Exercises you answer in lessons come back for review the next day.
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {data.reviewLoad.map((d, i) => (
              <li key={d.date} className="flex items-center gap-3 text-sm">
                <span className="text-muted w-28 shrink-0">
                  {i === 0 ? "Today" : i === 1 ? "Tomorrow" : shortDate.format(noonUtc(d.date))}
                </span>
                <span aria-hidden className="bg-sunken h-3 flex-1 overflow-hidden rounded-full">
                  <span
                    className="bg-primary block h-full rounded-full"
                    style={{ width: `${(d.count / maxLoad) * 100}%` }}
                  />
                </span>
                <span className="text-ink w-8 shrink-0 text-right font-medium">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="border-border bg-surface rounded-lg border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sessions-heading" className="text-ink text-lg font-semibold">
            Study sessions in {monthName}
          </h2>
          <Link href="/app/session" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Plan a session
          </Link>
        </div>
        {data.sessions.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {data.sessions.map((s) => (
              <li key={s.id} className="border-border flex flex-wrap justify-between gap-2 rounded-md border p-3">
                <span className="text-ink">
                  {dayFmt.format(s.startedAt)}, {timeFmt.format(s.startedAt)} · {s.plannedMinutes} min
                </span>
                <span className="text-muted">{s.completedAt ? "Finished" : "Not finished"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-4 text-sm">No planned sessions this month.</p>
        )}
      </section>
    </Container>
  );
}
