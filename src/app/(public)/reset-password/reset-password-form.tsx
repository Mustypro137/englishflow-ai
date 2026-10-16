"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormMessage, PasswordField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, passwordSchema } from "@/lib/validation/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token || linkError) {
    return (
      <div className="space-y-4">
        <FormMessage>This reset link is invalid or has expired. Please request a new one.</FormMessage>
        <Link href="/forgot-password" className={buttonClasses({ className: "w-full" })}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">Your password has been changed. You can now sign in with it.</FormMessage>
        <Link href="/sign-in" className={buttonClasses({ className: "w-full" })}>
          Sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = passwordSchema.safeParse(new FormData(e.currentTarget).get("password"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await authClient.resetPassword({ newPassword: parsed.data, token: token! });
    setPending(false);
    if (res.error) {
      setFormError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    setDone(true);
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage>{formError}</FormMessage>
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={error}
      />
      <SubmitButton className="w-full" pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
