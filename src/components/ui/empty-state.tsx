import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Explains what will appear in a view and how to get there — used instead of fake data. */
export function EmptyState({
  icon: Icon,
  title,
  headingLevel = 2,
  children,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  headingLevel?: 1 | 2 | 3;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "border-border-strong bg-surface flex flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="bg-primary-soft text-primary mb-4 flex size-12 items-center justify-center rounded-full">
          <Icon aria-hidden className="size-6" />
        </span>
      ) : null}
      <Heading className="text-ink text-lg font-semibold">{title}</Heading>
      {children ? <div className="text-muted mt-2 max-w-md text-sm">{children}</div> : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
