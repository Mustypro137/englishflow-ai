"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, Suspense } from "react";
import { cn } from "@/lib/utils/cn";

export function isActivePath(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavLinkProps = ComponentProps<typeof Link> & { href: string; exact?: boolean; activeClassName?: string };

/**
 * A link that marks itself with aria-current="page" when it matches the current route.
 * On routes whose URL is only known at request time (e.g. /app/learn/[lessonSlug]),
 * the plain link is prerendered and the active state streams in.
 */
export function NavLink({ exact, activeClassName, ...linkProps }: NavLinkProps) {
  return (
    <Suspense fallback={<Link {...linkProps} />}>
      <ActiveNavLink {...linkProps} exact={exact} activeClassName={activeClassName} />
    </Suspense>
  );
}

function ActiveNavLink({ href, exact = false, className, activeClassName, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...props}
    />
  );
}
