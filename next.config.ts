import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Find it uploads a food photo of up to 5 MB to a Server Action (F14.1), plus form overhead.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Defense in depth (Phase 10 security review): no framing, no MIME sniffing, a short referrer,
  // and the camera, microphone and location only for this site (Find, Calm, check-ins).
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), geolocation=(self)",
        },
      ],
    },
  ],
  // src/server/data.ts reads these at runtime, which the build's file tracing can't see.
  outputFileTracingIncludes: { "/*": ["./data/*.json"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
