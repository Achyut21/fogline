import { createSerwistRoute } from "@serwist/turbopack";

// A fresh revision per build, so a redeploy of the same commit with new chunk hashes also
// refreshes the cached offline page.
const revision = crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    globPatterns: [
      ".next/static/**/*.{js,css,html,ico,png,svg,webp,json,webmanifest}",
      ".next/static/media/*.p.*.woff2",
      "public/icons/*.png",
    ],
  },
);
