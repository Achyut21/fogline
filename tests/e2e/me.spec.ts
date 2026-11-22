import { expect, test, type Locator, type Page } from "@playwright/test";
import { app, me, onboarding as o } from "@/copy";

const s = me.settings;

async function onboard(page: Page) {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Sam");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("[F8.3] [F1.7] shows stats and badges, keeps settings, and deletes my data", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: me.stats.title })).toBeVisible();
  await expect(page.getByText(me.stats.uncovered)).toBeVisible();
  await expect(page.getByText(me.badges.empty)).toBeVisible();

  await page.getByRole("link", { name: s.open }).click();
  await expect(page.getByRole("heading", { name: s.title, level: 1 })).toBeVisible();
  await page.getByRole("radio", { name: s.mapOptions.flat }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: s.mapOptions.flat })).toBeChecked();
  await page.getByRole("radio", { name: s.ageOptions["21plus"] }).click();
  await expect(page.getByText(s.ageSaved)).toBeVisible();

  await page.getByRole("button", { name: s.delete.start }).click();
  await page.getByRole("button", { name: s.delete.confirm }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("link", { name: app.nav.me })).toHaveCount(0);
});

// The tab bar is pinned to the screen's bottom edge on the map and on long screens, scrolled or
// not (BottomNav; installed iOS apps size dvh short, so nothing relies on it).
test("pins the tab bar to the bottom edge of the screen", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: app.nav.label });
  const rect = (l: Locator) =>
    l.evaluate((e) => {
      const { top, bottom } = e.getBoundingClientRect();
      return { top, bottom };
    });
  const gap = async () =>
    (await page.evaluate(() => window.innerHeight)) - (await rect(nav)).bottom;

  await onboard(page);
  expect(await gap()).toBe(0);
  await page.goto("/how-it-works");
  await page.waitForLoadState("networkidle");
  expect(await gap()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await gap()).toBe(0);
  // Scrolled to the end, the last content clears the bar.
  const last = page.getByRole("main").locator(":scope > *").last();
  expect((await rect(last)).bottom).toBeLessThanOrEqual((await rect(nav)).top);
});
