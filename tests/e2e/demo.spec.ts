import { expect, test } from "@playwright/test";
import { demo, map, onboarding as o, system } from "@/copy";

// Demo mode (F16): each start gets its own seeded profile, and the Demo chip shows on every screen
// until a real profile is made.

test("[F16.1] [F16.3] starts a demo copy and labels every screen", async ({ page, browser }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: demo.page.start }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(map.uncoveredLabel)).toBeVisible();
  await expect(page.getByText(system.demo, { exact: true })).toBeVisible();
  await page.goto("/plans");
  await expect(page.getByText(system.demo, { exact: true })).toBeVisible();
  await expect(page.getByText(demo.nightTitle).first()).toBeVisible();

  // A second visitor gets a separate copy (F16.2): their plans don't list the first visitor's.
  const other = await browser.newContext();
  const second = await other.newPage();
  await second.goto("/demo");
  await second.getByRole("button", { name: demo.page.start }).click();
  await expect(second).toHaveURL(/\/$/);
  await second.goto("/plans");
  await expect(second.getByText(demo.nightTitle)).toHaveCount(1);
  await other.close();

  // Making a real profile clears the label.
  await page.goto("/welcome");
  await expect(
    page.getByLabel(o.welcome.nameLabel).or(page.getByText(map.uncoveredLabel)),
  ).toBeVisible();
});
