import { expect, test } from "@playwright/test";
import { find, onboarding as o, plans } from "@/copy";

test("[F14.1] opens Find food from Plans and refuses a file that isn't a photo", async ({
  page,
}) => {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Sam");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/plans");
  await page.getByRole("link", { name: find.open }).click();
  await expect(page.getByRole("heading", { name: find.title, level: 1 })).toBeVisible();
  await page.getByLabel(find.photo.label).setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a photo"),
  });
  await page.getByRole("button", { name: find.photo.submit }).click();
  await expect(page.getByText(find.errors["bad-image"])).toBeVisible();
  await expect(page.getByRole("link", { name: plans.plan.back })).toBeVisible();
});
