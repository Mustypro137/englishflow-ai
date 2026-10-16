import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldError } from "./field";

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Accessible radio or checkbox group using native inputs inside a fieldset,
 * so keyboard and screen-reader behaviour come from the browser.
 */
export function ChoiceGroup({
  legend,
  description,
  name,
  type,
  options,
  defaultValue,
  error,
  columns = 1,
}: {
  legend: string;
  description?: ReactNode;
  name: string;
  type: "radio" | "checkbox";
  options: readonly ChoiceOption[];
  defaultValue?: string | readonly string[] | null;
  error?: string;
  columns?: 1 | 2;
}) {
  const selected = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  const descId = description ? `${name}-desc` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset aria-describedby={[descId, errorId].filter(Boolean).join(" ") || undefined}>
      <legend className="text-ink text-base font-semibold">{legend}</legend>
      {description ? (
        <p id={descId} className="text-muted mt-1 text-sm">
          {description}
        </p>
      ) : null}
      <div className={cn("mt-3 grid gap-2", columns === 2 && "sm:grid-cols-2")}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className="border-border bg-surface has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-primary flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
          >
            <input
              type={type}
              name={name}
              value={opt.value}
              defaultChecked={selected.has(opt.value)}
              className="accent-primary mt-1 size-4 shrink-0 focus-visible:outline-none"
            />
            <span>
              <span className="text-ink block text-sm font-medium">{opt.label}</span>
              {opt.hint ? <span className="text-muted block text-sm">{opt.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
