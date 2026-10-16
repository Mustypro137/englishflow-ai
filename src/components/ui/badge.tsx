import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  neutral: "bg-sunken text-muted",
  primary: "bg-primary-soft text-primary-hover",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
