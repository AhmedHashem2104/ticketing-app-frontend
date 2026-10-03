import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Staff pages hold personal data: never cache them in shared caches or index them.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/** The fan site serves the shared media (event photos, crests, avatars, sample ID documents). */
const webOrigin = () => (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const, outputFileTracingRoot: path.join(import.meta.dirname, "../../") }
    : {}),
  transpilePackages: ["@repo/design-system", "@repo/contracts"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // Same-origin images keep the CSP tight (`img-src 'self'`).
    return [{ source: "/images/:path*", destination: `${webOrigin()}/images/:path*` }];
  },
};

export default nextConfig;
