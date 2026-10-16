import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
} as const;

export function Container({
  width = "default",
  className,
  ...props
}: ComponentProps<"div"> & { width?: keyof typeof widths }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6", widths[width], className)} {...props} />;
}
