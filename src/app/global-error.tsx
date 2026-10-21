"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/report";
import "./globals.css";

/** Last-resort error page, used only when the root layout itself fails. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportError(error), [error]);

  return (
    <html lang="en">
      <body className="bg-paper text-ink flex min-h-dvh items-center justify-center p-6">
        <main className="max-w-md text-center" role="alert">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted mt-2">
            EnglishFlow AI could not be shown. Your learning data is not affected. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="bg-primary text-on-primary hover:bg-primary-hover mt-6 h-11 rounded-md px-4 text-sm font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
