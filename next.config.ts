import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Find it uploads a food photo of up to 5 MB to a Server Action (F14.1), plus form overhead.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
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
