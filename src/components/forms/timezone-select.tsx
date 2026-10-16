"use client";

import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/form-controls";
import { FieldError } from "./field";

function allTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

/** Time zone picker. With no saved value, it preselects the browser's time zone. */
export function TimezoneSelect({ defaultValue, error }: { defaultValue?: string | null; error?: string }) {
  const id = useId();
  const [zones] = useState(allTimeZones);
  const [value, setValue] = useState(defaultValue ?? "UTC");

  useEffect(() => {
    if (!defaultValue) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Syncing with a browser-only value after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (detected) setValue(detected);
    }
  }, [defaultValue]);

  const options = zones.includes(value) ? zones : [value, ...zones];
  const hintId = `${id}-hint`;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Time zone</Label>
      <p id={hintId} className="text-muted text-sm">
        Used to decide when reviews are due &ldquo;today&rdquo; for you.
      </p>
      <select
        id={id}
        name="timezone"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        className="border-border-strong bg-surface text-ink h-11 w-full rounded-md border px-3 text-base"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
