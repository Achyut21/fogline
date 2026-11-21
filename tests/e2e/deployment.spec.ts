import { expect, test } from "@playwright/test";

test.skip(!process.env.PLAYWRIGHT_BASE_URL, "runs only against a Vercel deployment");
test.skip(({ browserName }) => browserName !== "chromium", "one browserless check is enough");

test("health reports the database and TimescaleDB up", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ db: true, timescaledb: true });
});
