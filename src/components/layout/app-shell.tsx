import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getNavModules, groupModules, splitMobileNav } from "@/lib/modules";
import { AppMobileNav } from "./app-mobile-nav";
import { Logo } from "./logo";
import { ModuleIcon } from "./module-icon";
import { NavLink } from "./nav-link";

const sideLink = "text-ink hover:bg-sunken flex items-center gap-3 rounded-md px-2 py-2 text-sm";
const sideLinkActive = "bg-primary-soft font-medium text-primary-hover";

/**
 * Learner application frame. Navigation is generated from the module registry
 * and contains only modules that are available. `account` is rendered inside a
 * Suspense boundary by the layout because it reads the session.
 */
export function AppShell({ children, account }: { children: ReactNode; account: ReactNode }) {
  const modules = getNavModules();
  const groups = groupModules(modules);
  const mobile = splitMobileNav(modules);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="border-border bg-surface hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-16 items-center px-4">
          <Logo href="/app" />
        </div>
        <nav aria-label="Learning" className="flex-1 overflow-y-auto px-3 py-2">
          {groups.map((g) => (
            <div key={g.group} className="mb-4">
              <p className="text-muted px-2 pb-1 text-xs font-medium tracking-wide uppercase">{g.label}</p>
              <ul className="space-y-0.5">
                {g.modules.map((m) => (
                  <li key={m.id}>
                    <NavLink
                      href={m.href}
                      exact={m.href === "/app"}
                      className={sideLink}
                      activeClassName={sideLinkActive}
                    >
                      <ModuleIcon name={m.icon} className="size-4" />
                      {m.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-border space-y-1 border-t p-3">
          {account}
          <Link
            href="/"
            className="text-muted hover:bg-sunken hover:text-ink flex items-center gap-2 rounded-md px-2 py-2 text-sm"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to website
          </Link>
        </div>
      </aside>

      <header className="border-border bg-surface flex h-14 items-center justify-between gap-2 border-b px-4 md:hidden">
        <Logo href="/app" />
        <div className="flex items-center">{account}</div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 pb-20 focus:outline-none md:pb-0">
        {children}
      </main>

      <AppMobileNav primary={mobile.primary} more={mobile.more} />
    </div>
  );
}
