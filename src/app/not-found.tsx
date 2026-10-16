import { Compass } from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Container width="narrow" className="py-16">
          <EmptyState
            icon={Compass}
            headingLevel={1}
            title="Page not found"
            actions={
              <Link href="/" className={buttonClasses()}>
                Go to the home page
              </Link>
            }
          >
            <p>The page you were looking for does not exist or has moved.</p>
          </EmptyState>
        </Container>
      </main>
      <PublicFooter />
    </>
  );
}
