import { expect, test, type Page } from "@playwright/test";
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
