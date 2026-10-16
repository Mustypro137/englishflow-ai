import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { PUBLIC_NAV } from "./site-nav";

export function PublicHeader() {
  return (
    <header className="border-border bg-paper/95 border-b">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="text-muted hover:bg-sunken hover:text-ink rounded-md px-3 py-2 text-sm"
                  activeClassName="font-medium text-ink"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <NavLink href="/sign-in">Sign in</NavLink>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <NavLink href="/sign-up">Create account</NavLink>
          </Button>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
