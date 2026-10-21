import { scrubBreadcrumb, scrubEvent } from "./scrub";

/**
 * Error monitoring is off unless NEXT_PUBLIC_SENTRY_DSN is set (a DSN is public by design:
 * it only allows sending events). Without it, Sentry is never even loaded.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;

/** Origin events are sent to, for the Content-Security-Policy's connect-src. */
export function sentryOrigin(dsn = SENTRY_DSN): string | null {
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

/** Options shared by the browser, Node.js and edge SDKs. */
export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors only: no performance tracing, session replay or user details.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 30,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
