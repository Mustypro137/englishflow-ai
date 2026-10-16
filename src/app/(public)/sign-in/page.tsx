import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/forms/auth-card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Pick up where you left off."
      footer={
        <p>
          New to EnglishFlow AI?{" "}
          <Link href="/sign-up" className="text-primary rounded-sm font-medium underline underline-offset-4">
            Create an account
          </Link>
        </p>
      }
    >
      {/* The form reads ?next= from the URL, which is only known at request time. */}
      <Suspense fallback={<p className="text-muted text-sm">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
