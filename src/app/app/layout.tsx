import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: { default: "Learning app", template: "%s · EnglishFlow AI" },
  robots: { index: false },
};

export default function LearnerAppLayout({ children }: LayoutProps<"/app">) {
  return (
    <AppShell
      account={
        <Suspense fallback={null}>
          <AccountMenu />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
