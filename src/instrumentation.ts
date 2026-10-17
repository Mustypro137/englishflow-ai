import type { Instrumentation } from "next";
import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring/sentry";

/** Server-side error monitoring (Node.js and edge). Does nothing until a DSN is configured. */
export async function register() {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions());
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
