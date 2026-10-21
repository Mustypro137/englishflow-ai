import { cn } from "@/lib/utils/cn";

/** Study activity for the last seven days, ending today. Each bar is a real count of answers and reviews. */
export function WeekChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  // Dates are local calendar days; format them at noon UTC so the weekday never shifts.
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <ol aria-label="Answers and reviews per day, last 7 days" className="mt-4 flex h-32 items-end gap-1.5">
      {days.map((d, i) => {
        const at = new Date(`${d.date}T12:00:00Z`);
        const isToday = i === days.length - 1;
        return (
          <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span aria-hidden className="text-muted text-xs">
              {d.count > 0 ? d.count : ""}
            </span>
            <span
              aria-hidden
              className={cn(
                "w-full rounded-sm",
                d.count > 0
                  ? isToday
                    ? "bg-accent"
                    : "bg-primary"
                  : "border-border-strong h-2.5 border border-dashed",
              )}
              style={d.count > 0 ? { height: `${Math.max(8, (d.count / max) * 80)}%` } : undefined}
            />
            <span aria-hidden className={cn("text-xs", isToday ? "text-ink font-semibold" : "text-muted")}>
              {isToday ? "Today" : weekday.format(at)}
            </span>
            <span className="sr-only">
              {isToday ? "Today, " : ""}
              {full.format(at)}: {d.count} {d.count === 1 ? "activity" : "activities"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
