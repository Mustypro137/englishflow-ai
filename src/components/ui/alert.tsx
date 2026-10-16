import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const tones = {
  info: { box: "border-primary/30 bg-primary-soft", icon: Info, iconClass: "text-primary" },
  warning: { box: "border-warning/30 bg-warning-soft", icon: TriangleAlert, iconClass: "text-warning" },
  success: { box: "border-success/30 bg-success-soft", icon: CircleCheck, iconClass: "text-success" },
  danger: { box: "border-danger/30 bg-danger-soft", icon: CircleAlert, iconClass: "text-danger" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  tone?: keyof typeof tones;
  title: ReactNode;
}) {
  const { box, icon: Icon, iconClass } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", box, className)} {...props}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconClass)} />
      <div className="space-y-1 text-sm">
        <p className="text-ink font-semibold">{title}</p>
        {children ? <div className="text-ink/85">{children}</div> : null}
      </div>
    </div>
  );
}
