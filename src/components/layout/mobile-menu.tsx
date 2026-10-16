"use client";

import { Menu, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NavLink } from "./nav-link";
import { PUBLIC_NAV } from "./site-nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu aria-hidden />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink/30 fixed inset-0 z-40" />
        <Dialog.Content className="bg-surface fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col p-4 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <nav aria-label="Mobile" className="mt-4">
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...PUBLIC_NAV].map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-ink hover:bg-sunken block rounded-md px-3 py-3 text-base"
                    activeClassName="bg-primary-soft font-medium text-primary-hover"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-border mt-auto space-y-2 border-t pt-4">
            <Button asChild className="w-full">
              <NavLink href="/sign-up" onClick={() => setOpen(false)}>
                Create account
              </NavLink>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <NavLink href="/sign-in" onClick={() => setOpen(false)}>
                Sign in
              </NavLink>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
