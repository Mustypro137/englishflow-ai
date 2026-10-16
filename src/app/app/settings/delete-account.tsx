"use client";

import { TriangleAlert } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage, PasswordField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Permanently deletes the account and all learning records (cascade), after password confirmation. */
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setPending(true);
    setError(undefined);
    const { error: err } = await authClient.deleteUser({ password });
    setPending(false);
    if (err) {
      setError(
        err.status === 400 || err.status === 401
          ? "That password is incorrect."
          : "We couldn't delete your account. Please try again.",
      );
      return;
    }
    router.push("/?account=deleted");
    router.refresh();
  }

  return (
    <div className="border-danger/30 bg-danger-soft rounded-md border p-4">
      <p className="text-ink text-sm font-semibold">Delete account</p>
      <p className="text-ink/85 mt-1 text-sm">
        Permanently deletes your account, profile, preferences and all saved learning records. This cannot be undone.
      </p>
      <Dialog.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          setError(undefined);
        }}
      >
        <Dialog.Trigger asChild>
          <Button variant="secondary" className="text-danger mt-3">
            Delete my account…
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="bg-ink/40 fixed inset-0 z-40" />
          <Dialog.Content className="bg-surface fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-xl focus:outline-none">
            <div className="flex items-start gap-3">
              <TriangleAlert aria-hidden className="text-danger mt-0.5 size-5 shrink-0" />
              <div>
                <Dialog.Title className="text-ink text-lg font-semibold">Delete your account?</Dialog.Title>
                <Dialog.Description className="text-muted mt-1 text-sm">
                  All your learning records will be removed permanently. Enter your password to confirm.
                </Dialog.Description>
              </div>
            </div>
            <form method="post" onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
              <FormMessage>{error}</FormMessage>
              <PasswordField label="Password" name="password" autoComplete="current-password" required />
              <div className="flex flex-wrap justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="secondary">Cancel</Button>
                </Dialog.Close>
                <SubmitButton pending={pending} pendingLabel="Deleting…" className="bg-danger hover:bg-danger/90">
                  Delete permanently
                </SubmitButton>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
