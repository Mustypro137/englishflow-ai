"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { reportError } from "@/lib/monitoring/report";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportError(error), [error]);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
      <Container width="narrow" className="py-16">
        <h1 className="sr-only">Something went wrong</h1>
        <Alert tone="danger" title="Something went wrong" role="alert">
          <p>This page could not be shown. Your learning data is not affected. Please try again.</p>
          <Button className="mt-4" onClick={() => retry()}>
            Try again
          </Button>
        </Alert>
      </Container>
    </main>
  );
}
