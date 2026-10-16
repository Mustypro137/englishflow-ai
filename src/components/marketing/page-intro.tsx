import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="border-border bg-surface border-b">
      <Container width="narrow" className="py-12 sm:py-16">
        {eyebrow ? <p className="text-primary text-sm font-medium">{eyebrow}</p> : null}
        <h1 className="text-ink mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {children ? <div className="text-muted mt-4 text-lg">{children}</div> : null}
      </Container>
    </div>
  );
}
