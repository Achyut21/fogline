import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";
import { bypassStatePath, deploymentURL } from "./tests/e2e/deployment-url";

const port = 3100;
const ci = Boolean(process.env.CI);
const phone = { width: 390, height: 844 };
const remoteURL = deploymentURL();
const bypass = Boolean(remoteURL && process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

// The local e2e server must never reach fogline-db: it gets the throwaway test database (empty
// when none is configured, so /api/health answers 503) instead of DATABASE_URL from .env.
const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const testDatabaseURL = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST ?? "";
// The local server signs profile cookies with the developer's secret, or a test-only one.
const sessionSecret =
  process.env.SESSION_SECRET ?? fileEnv.SESSION_SECRET ?? "e2e-only-session-secret";

// Full Chromium instead of the headless shell: the shell reports no installability errors even
// for a page with no manifest, so the installability test could never fail there.
const chromium = { channel: "chromium" };

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: remoteURL ?? `http://localhost:${port}`,
    timezoneId: "America/New_York",
    // Traces record request headers, so none are kept while testing a protected deployment.
    trace: bypass ? "off" : "retain-on-failure",
    storageState: bypass ? bypassStatePath : undefined,
    // A controlling service worker would hide requests from page.route mocks. Only the
    // service-worker tests turn it back on.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], ...chromium, viewport: { width: 1440, height: 900 } },
    },
    { name: "iphone", use: { ...devices["iPhone 15"], viewport: phone } },
    { name: "pixel", use: { ...devices["Pixel 7"], ...chromium, viewport: phone } },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: ci ? `pnpm start -p ${port}` : `pnpm build && pnpm start -p ${port}`,
        url: `http://localhost:${port}`,
        // Never reuse a server already on the port: it may have loaded fogline-db from .env.
        reuseExistingServer: false,
        timeout: 240_000,
        env: { TZ: "UTC", DATABASE_URL: testDatabaseURL, SESSION_SECRET: sessionSecret },
      },
});
