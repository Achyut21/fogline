import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const ci = Boolean(process.env.CI);
const phone = { width: 390, height: 844 };

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    timezoneId: "America/New_York",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "iphone", use: { ...devices["iPhone 15"], viewport: phone } },
    { name: "pixel", use: { ...devices["Pixel 7"], viewport: phone } },
  ],
  webServer: {
    command: ci ? `pnpm start -p ${port}` : `pnpm build && pnpm start -p ${port}`,
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: 240_000,
    env: { TZ: "UTC" },
  },
});
