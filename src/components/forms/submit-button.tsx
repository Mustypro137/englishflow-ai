"use client";

import { useSyncExternalStore } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

const subscribe = () => () => {};

/** False during server rendering and hydration, true once the page's JavaScript is running. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Submit button that stays disabled until the page is interactive, so an early
 * click is never lost and the browser never falls back to a native form submit.
 */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "type"> & { pending?: boolean; pendingLabel?: string }) {
  const hydrated = useHydrated();
  return (
    <Button type="submit" disabled={!hydrated || pending || disabled} aria-disabled={undefined} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
