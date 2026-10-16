import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Your lessons, reviews and notes will be saved to your account."
      footer={
        <>
          <p>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary rounded-sm font-medium underline underline-offset-4">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-xs">
            By creating an account you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy policy
            </Link>{" "}
            (currently placeholders under review).
          </p>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
