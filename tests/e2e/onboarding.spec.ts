import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { onboarding as o } from "@/copy";

test("[F1.1] [F1.2] [F1.3] makes a profile in four screens, keeps it, and restores it elsewhere", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await page.getByLabel(o.welcome.nameLabel).fill("Maya");
  await page.getByRole("button", { name: o.next }).click();
  await expect(page.getByText(o.step(2))).toBeVisible();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await expect(page.getByRole("radio", { checked: true })).toContainText(o.station.suggested);
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/me");
  await expect(page.getByRole("heading", { level: 1, name: "Maya" })).toBeVisible();
  const code = (await page.getByTestId("profile-code").textContent()) ?? "";
  expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4} [2-9A-HJKMNP-Z]{4}$/);

  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto("/restore");
  await phone.getByLabel(o.restore.label).fill("ZZZZ ZZZZ");
  await phone.getByRole("button", { name: o.restore.submit }).click();
  await expect(phone.getByText(o.restore.notFound)).toBeVisible();
  await phone.getByLabel(o.restore.label).fill(code.toLowerCase().replace(" ", "-"));
  await phone.getByRole("button", { name: o.restore.submit }).click();
  await expect(phone).toHaveURL(/\/$/);
  await phone.goto("/me");
  await expect(phone.getByRole("heading", { level: 1, name: "Maya" })).toBeVisible();
  await other.close();
});
