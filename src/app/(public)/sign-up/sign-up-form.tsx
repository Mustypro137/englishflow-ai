"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage, PasswordField, TextField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, signUpSchema } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/profile";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [checkEmailFor, setCheckEmailFor] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { data, error } = await authClient.signUp.email({ ...parsed.data, callbackURL: "/app/onboarding" });
    setPending(false);
    if (error) {
      setFormError(
        error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "An account with this email already exists. Try signing in instead."
          : (error.message ?? "We couldn't create your account. Please try again."),
      );
      return;
    }
    if (data?.token) {
      router.push("/app/onboarding");
      router.refresh();
    } else {
      // Email verification is required before the first sign-in.
      setCheckEmailFor(parsed.data.email);
    }
  }

  if (checkEmailFor) {
    return (
      <FormMessage tone="success">
        Check your inbox at {checkEmailFor}. We sent a link to confirm your email address. After confirming, you will be
        signed in automatically.
      </FormMessage>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage>{formError}</FormMessage>
      <TextField label="Name" name="name" autoComplete="name" required error={errors.name} />
      <TextField label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
      <PasswordField
        name="password"
        autoComplete="new-password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase is easy to remember.`}
        error={errors.password}
      />
      <SubmitButton className="w-full" pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
