import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

process.env.TZ = "America/New_York";

const alias = { "@": path.resolve(import.meta.dirname, "src") };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/utils.ts"],
      thresholds: {
        "src/lib/**/*.ts": { lines: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/msw.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          setupFiles: ["tests/setup/msw.ts", "tests/setup/dom.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup/msw.ts"],
        },
      },
    ],
  },
});
