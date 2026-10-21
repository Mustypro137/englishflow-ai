import { SENTRY_DSN } from "./sentry";

/** Report an error caught by an error boundary (which global handlers never see). */
export function reportError(error: unknown) {
  console.error(error);
  if (!SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
}
