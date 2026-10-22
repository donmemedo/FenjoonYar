import type { NextConfig } from "next";

// Build-time: the standalone server freezes rewrites() into routes-manifest.
const API = (process.env.API_INTERNAL_URL || "http://127.0.0.1:8044").replace(/\/$/, "");
const HSTS = "max-age=31536000; includeSubDomains";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // ponytail: frozen at build time. middleware.ts repeats HSTS from the runtime env, so
  // ENABLE_HSTS=1 on the container works without a rebuild.
  ...(process.env.ENABLE_HSTS === "1" ? [{ key: "Strict-Transport-Security", value: HSTS }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The browser only talks to this origin; Next proxies /api to FastAPI (no CORS, no preflight).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Unversioned static files: a week at the edge, revalidated after (sw.js is left alone).
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
