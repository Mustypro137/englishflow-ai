import { z } from "zod";
import { SENTRY_DSN, sentryOptions } from "@/lib/monitoring/sentry";

// Runs in the browser before any app code. Zod otherwise probes `new Function` when a schema
// is defined; the Content-Security-Policy blocks eval, and browsers report the probe as a
// violation even though Zod catches it and falls back to this same non-compiled mode.
z.config({ jitless: true });

// Browser error monitoring, loaded only when configured so it costs nothing otherwise.
if (SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init(sentryOptions()));
}
