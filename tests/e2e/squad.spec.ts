import { expect, test } from "@playwright/test";
import { onboarding as o, squad } from "@/copy";

test("[F12.1] a new profile opens Squad from Me and sees how to start one", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Sam");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/me");
  await page.getByRole("link", { name: squad.open }).click();
  await expect(page.getByRole("heading", { name: squad.empty.title })).toBeVisible();
  await expect(page.getByRole("link", { name: squad.empty.action })).toBeVisible();
});
