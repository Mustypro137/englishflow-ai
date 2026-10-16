"use client";

import { useState } from "react";
import { FormMessage, TextField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { authClient } from "@/lib/auth-client";
import { emailSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = emailSchema.safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await authClient.requestPasswordReset({ email: parsed.data, redirectTo: "/reset-password" });
    setPending(false);
    if (res.error?.status === 429) {
      setFormError("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    // Always show the same message, whether or not the account exists.
    setSent(true);
  }

  if (sent) {
    return (
      <FormMessage tone="success">
        If an account exists for that email, a reset link is on its way. The link is valid for one hour.
      </FormMessage>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage>{formError}</FormMessage>
      <TextField label="Email" name="email" type="email" autoComplete="email" required error={error} />
      <SubmitButton className="w-full" pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
