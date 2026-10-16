"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Input, Label } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

/** Text field with a label, optional hint and an error message wired up for screen readers. */
export function TextField({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...inputProps
}: ComponentProps<"input"> & { label: string; hint?: ReactNode; error?: string }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...inputProps}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function PasswordField({
  label = "Password",
  hint,
  error,
  ...inputProps
}: Omit<ComponentProps<"input">, "type"> & { label?: string; hint?: ReactNode; error?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          className="pr-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="text-muted hover:text-ink absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-danger text-sm">
      {message}
    </p>
  );
}

/** Form-level message announced to screen readers when it appears. */
export function FormMessage({ tone = "error", children }: { tone?: "error" | "success"; children?: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite">
      {children ? (
        <p
          className={cn(
            "rounded-md p-3 text-sm",
            tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
          )}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
