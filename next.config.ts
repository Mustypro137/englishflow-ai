import type { NextConfig } from "next";
import { sentryOrigin } from "./src/lib/monitoring/sentry";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers() {
    const headers = securityHeaders({
      dev: process.env.NODE_ENV === "development",
      // Vercel builds are always served over HTTPS; local `next start` is plain HTTP.
      https: process.env.VERCEL === "1",
      monitoringOrigin: sentryOrigin(),
    });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
