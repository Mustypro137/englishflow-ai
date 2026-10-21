"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormMessage, PasswordField, TextField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { authClient } from "@/lib/auth-client";
import { safeAppRedirect, signInSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/profile";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAppRedirect(searchParams.get("next"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email({ ...parsed.data, callbackURL: next });
    if (error) {
      setPending(false);
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setFormError("Please confirm your email address first. We have sent you a new confirmation link.");
      } else if (error.status === 429) {
        setFormError("Too many attempts. Please wait a minute and try again.");
      } else {
        // Same message for unknown email and wrong password, so accounts can't be discovered.
        setFormError("The email or password is incorrect.");
      }
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage>{formError}</FormMessage>
      <TextField label="Email" name="email" type="email" autoComplete="off" required error={errors.email} />
      <PasswordField name="password" autoComplete="current-password" required error={errors.password} />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-primary rounded-sm underline underline-offset-4">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton className="w-full" pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
