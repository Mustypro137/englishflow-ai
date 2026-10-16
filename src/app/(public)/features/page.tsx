import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/page-intro";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { groupModules, LEARNER_MODULES } from "@/lib/modules";

export const metadata: Metadata = {
  title: "Features",
  description: "The learning modules in EnglishFlow AI and the status of each.",
};

export default function FeaturesPage() {
  const groups = groupModules(LEARNER_MODULES);
  const availableCount = LEARNER_MODULES.filter((m) => m.status === "available").length;

  return (
    <>
      <PageIntro eyebrow="Features" title="Everything you need to learn English — and keep it">
        <p>
          Each module below is part of the plan. Modules are marked <em>Available</em> only once they work end to end.{" "}
          {availableCount === 0 ? "Right now every module is still in development." : null}
        </p>
      </PageIntro>
      <Container width="narrow" className="space-y-12 py-12">
        {groups.map((g) => (
          <section key={g.group} aria-labelledby={`group-${g.group}`}>
            <h2 id={`group-${g.group}`} className="text-ink text-xl font-semibold">
              {g.label}
            </h2>
            <ul className="divide-border border-border bg-surface mt-4 divide-y rounded-lg border">
              {g.modules.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  <div>
                    <h3 className="text-ink font-medium">{m.label}</h3>
                    <p className="text-muted mt-1 text-sm">{m.description}</p>
                  </div>
                  {m.status === "available" ? (
                    <Badge tone="success" className="self-start">
                      Available
                    </Badge>
                  ) : (
                    <Badge className="self-start whitespace-nowrap">In development</Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
