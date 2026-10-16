import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container width="narrow" className="flex justify-center py-12 sm:py-16">
      <div className="border-border bg-surface w-full max-w-md rounded-lg border p-6 shadow-sm sm:p-8">
        <h1 className="text-ink text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <div className="text-muted mt-2 text-sm">{description}</div> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="border-border text-muted mt-6 border-t pt-4 text-sm">{footer}</div> : null}
      </div>
    </Container>
  );
}
