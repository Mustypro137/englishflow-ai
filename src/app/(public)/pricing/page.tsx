import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/marketing/page-intro";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pricing for EnglishFlow AI has not been set yet.",
};

export default function PricingPage() {
  return (
    <>
      <PageIntro eyebrow="Pricing" title="Pricing is not set yet">
        <p>EnglishFlow AI is in development and is not available to buy.</p>
      </PageIntro>
      <Container width="narrow" className="space-y-6 py-12">
        <Alert tone="info" title="Nothing to pay for today">
          There are no paid plans and no payment details are collected anywhere on this site. When plans are decided,
          this page will describe exactly what each one includes before any payment is possible.
        </Alert>
        <p className="text-ink/90">
          In the meantime you can read about{" "}
          <Link href="/how-it-works" className="text-primary rounded-sm underline underline-offset-4">
            how learning works
          </Link>{" "}
          or see{" "}
          <Link href="/curriculum" className="text-primary rounded-sm underline underline-offset-4">
            which levels are being built
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
