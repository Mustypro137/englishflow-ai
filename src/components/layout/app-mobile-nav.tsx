"use client";

import { Ellipsis, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LearnerModule } from "@/lib/modules";
import { ModuleIcon } from "./module-icon";
import { NavLink } from "./nav-link";

const itemClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs text-muted hover:text-ink";

/** Bottom navigation for small screens: up to four primary modules plus a "More" sheet. */
export function AppMobileNav({
  primary,
  more,
  reviewBadge,
}: {
  primary: LearnerModule[];
  more: LearnerModule[];
  /** Due-review count, shown on the Review item wherever it is. */
  reviewBadge: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Learning" className="border-border bg-surface fixed inset-x-0 bottom-0 z-30 border-t md:hidden">
      <ul className="flex px-2">
        {primary.map((m) => (
          <li key={m.id} className="flex flex-1">
            <NavLink
              href={m.href}
              exact={m.href === "/app"}
              className={itemClass}
              activeClassName="font-medium text-primary"
            >
              <span className="relative">
                <ModuleIcon name={m.icon} className="size-5" />
                {m.id === "review" ? <span className="absolute -top-2 left-3.5">{reviewBadge}</span> : null}
              </span>
              {m.label}
            </NavLink>
          </li>
        ))}
        {more.length > 0 ? (
          <li className="flex flex-1">
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger className={itemClass}>
                <Ellipsis aria-hidden className="size-5" />
                More
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="bg-ink/30 fixed inset-0 z-40" />
                <Dialog.Content className="bg-surface fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-lg p-4 shadow-xl focus:outline-none">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-base font-semibold">More</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="Close">
                        <X aria-hidden />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">Other learning areas</Dialog.Description>
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {more.map((m) => (
                      <li key={m.id}>
                        <NavLink
                          href={m.href}
                          exact={m.href === "/app"}
                          onClick={() => setOpen(false)}
                          className="text-ink hover:bg-sunken flex items-center gap-3 rounded-md px-3 py-3 text-sm"
                          activeClassName="bg-primary-soft font-medium text-primary-hover"
                        >
                          <ModuleIcon name={m.icon} className="size-4" />
                          {m.label}
                          {m.id === "review" ? <span className="ml-auto">{reviewBadge}</span> : null}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
