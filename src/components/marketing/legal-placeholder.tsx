import { PageIntro } from "@/components/marketing/page-intro";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";

/** Placeholder legal page. Must be replaced by reviewed text before public launch. */
export function LegalPlaceholder({ title, topics }: { title: string; topics: readonly string[] }) {
  return (
    <>
      <PageIntro eyebrow="Legal" title={title} />
      <Container width="narrow" className="space-y-8 py-12">
        <Alert tone="warning" title="Placeholder — requires legal review before launch">
          This page is not a legal document yet. It lists the topics the final version will cover. Do not rely on it.
        </Alert>
        <section aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="text-ink text-lg font-semibold">
            Topics the final version will cover
          </h2>
          <ul className="text-ink/90 mt-3 list-disc space-y-2 pl-6">
            {topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
