import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LEGAL_NAV, PUBLIC_NAV } from "./site-nav";

export function PublicFooter() {
  return (
    <footer className="border-border bg-sunken mt-auto border-t">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="text-ink font-semibold">EnglishFlow AI</p>
          <p className="text-muted text-sm">
            In development. Accounts work; lessons, reviews and the AI tutor are being built. This site shows what
            exists and what is coming.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-12 text-sm">
          <ul className="space-y-2">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-ink rounded-sm">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="space-y-2">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-ink rounded-sm">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
