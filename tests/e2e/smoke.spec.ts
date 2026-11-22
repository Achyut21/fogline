import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboarding } from "@/copy";

test("home sends a new visitor to onboarding with no serious or critical axe violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByRole("heading", { level: 1, name: onboarding.welcome.title }),
  ).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking).toEqual([]);
});

test("home has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("runs the browser in America/New_York", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
    "America/New_York",
  );
});

test("lists an iOS splash screen for each iPhone size in day and night", async ({ page }) => {
  await page.goto("/welcome");
  const links = page.locator('link[rel="apple-touch-startup-image"]');
  await expect(links).toHaveCount(16);
  const first = await links.first().getAttribute("href");
  expect((await page.request.get(first ?? "")).status()).toBe(200);
});
