import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export default function LearnerNotFound() {
  return (
    <Container width="narrow" className="py-12">
      <EmptyState
        icon={Compass}
        headingLevel={1}
        title="Page not found"
        actions={
          <Link href="/app/learn" className={buttonClasses()}>
            Go to the curriculum
          </Link>
        }
      >
        <p>This page doesn&apos;t exist, or the lesson isn&apos;t written yet.</p>
      </EmptyState>
    </Container>
  );
}
