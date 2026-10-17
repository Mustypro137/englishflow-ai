/**
 * HTTP security headers for every response (applied in next.config.ts).
 *
 * The CSP has no nonces: pages use Partial Prerendering and `use cache`, and a per-request
 * nonce can't reach a prerendered shell. Next.js's own inline bootstrap scripts therefore
 * need 'unsafe-inline'. Everything else is locked to this site, plus Vercel Blob for
 * pre-generated audio. Fonts are self-hosted by next/font, AI calls happen on the server,
 * and the browser's speech services aren't governed by CSP.
 */

/** Where pre-generated audio files live (see scripts/generate-audio.ts). */
const AUDIO_ORIGIN = "https://*.public.blob.vercel-storage.com";

export interface SecurityHeaderOptions {
  dev?: boolean;
  https?: boolean;
  /** Error-monitoring origin (Sentry), allowed in connect-src only when monitoring is configured. */
  monitoringOrigin?: string | null;
}

export function contentSecurityPolicy({
  dev = false,
  https = false,
  monitoringOrigin,
}: SecurityHeaderOptions = {}): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // blob: plays back the learner's own recordings in the pronunciation lab.
    `media-src 'self' blob: ${AUDIO_ORIGIN}`,
    `connect-src 'self'${monitoringOrigin ? ` ${monitoringOrigin}` : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Only over HTTPS: on plain-HTTP localhost it would break same-origin requests.
    ...(https ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions = {}) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // Browsers ignore HSTS over plain HTTP, so it's safe to send everywhere.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // The microphone is used only by the pronunciation lab, on this site.
    {
      key: "Permissions-Policy",
      value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
