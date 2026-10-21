import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `));

describe("security headers", () => {
  it("forbids framing, plugins and foreign scripts, styles, connections and form targets", () => {
    const csp = contentSecurityPolicy();
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
    expect(directive(csp, "script-src")).not.toMatch(/https?:|\*/);
    expect(directive(csp, "style-src")).not.toMatch(/https?:|\*/);
  });

  it("allows eval only in development", () => {
    expect(contentSecurityPolicy()).not.toContain("unsafe-eval");
    expect(directive(contentSecurityPolicy({ dev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("allows the error-monitoring origin only when monitoring is configured", () => {
    expect(directive(contentSecurityPolicy({ monitoringOrigin: null }), "connect-src")).toBe("connect-src 'self'");
    expect(directive(contentSecurityPolicy({ monitoringOrigin: "https://o1.ingest.sentry.io" }), "connect-src")).toBe(
      "connect-src 'self' https://o1.ingest.sentry.io",
    );
  });

  it("upgrades insecure requests only when served over HTTPS", () => {
    expect(contentSecurityPolicy()).not.toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ https: true })).toContain("upgrade-insecure-requests");
  });

  it("lets audio come from this site, recordings and Vercel Blob only", () => {
    expect(directive(contentSecurityPolicy(), "media-src")).toBe(
      "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
    );
  });

  it("sends HSTS, nosniff, a referrer policy and allows only the microphone, for this site", () => {
    const headers = Object.fromEntries(securityHeaders().map((h) => [h.key, h.value]));
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("microphone=(self)");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
