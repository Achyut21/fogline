import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

process.env.TZ = "America/New_York";

const alias = { "@": path.resolve(import.meta.dirname, "src") };

// Integration tests only ever see the throwaway test database, even as DATABASE_URL, so code that
// calls getDb() can't write to fogline-db. The read-only live check needs LIVE_DATABASE_URL from
// the shell on purpose.
const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const testUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST ?? "";
const databaseEnv = {
  DATABASE_URL: testUrl,
  DATABASE_URL_TEST: testUrl,
  LIVE_DATABASE_URL: process.env.LIVE_DATABASE_URL ?? "",
};

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
          env: databaseEnv,
          setupFiles: ["tests/setup/msw.ts"],
        },
      },
    ],
  },
});
