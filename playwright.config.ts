import { defineConfig, devices } from "@playwright/test";
import { bypassStatePath, deploymentURL } from "./tests/e2e/deployment-url";

const port = 3100;
const ci = Boolean(process.env.CI);
const phone = { width: 390, height: 844 };
const remoteURL = deploymentURL();
const bypass = Boolean(remoteURL && process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

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
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "iphone", use: { ...devices["iPhone 15"], viewport: phone } },
    { name: "pixel", use: { ...devices["Pixel 7"], viewport: phone } },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: ci ? `pnpm start -p ${port}` : `pnpm build && pnpm start -p ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !ci,
        timeout: 240_000,
        env: { TZ: "UTC" },
      },
});
