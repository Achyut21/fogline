import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { legal, map, onboarding as o } from "@/copy";

const s = map.sheet;

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

test("[F2.5] opens a station's sheet with live trains, its stop card and nearby spots", async ({
  page,
}) => {
  await onboard(page);

  await page.getByRole("radio", { name: map.view.list }).click();
  await page.getByRole("button", { name: /^Boston University Central/ }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Boston University Central" })).toBeVisible();
  await expect(sheet.getByText(s.home)).toBeVisible();
  await expect(sheet.getByRole("heading", { name: s.trains })).toBeVisible();
  // Live data: a train list, the empty state late at night, or the error state if the MBTA is down.
  await expect(
    sheet
      .getByText(legal.mbta)
      .or(sheet.getByText(s.empty.title))
      .or(sheet.getByText(s.error.title))
      .first(),
  ).toBeVisible({ timeout: 5_000 });
  await expect(sheet.getByRole("heading", { name: s.card })).toBeVisible();
  await expect(sheet.getByRole("heading", { name: s.nearby })).toBeVisible();
  await expect(sheet.getByText(`${s.category.bar} ·`)).toHaveCount(0);

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await sheet.getByRole("button", { name: s.close }).click();
  await expect(sheet).toBeHidden();
});

test("[F2.5] opens the sheet with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onboard(page);
  await page.getByRole("radio", { name: map.view.list }).click();
  await page.getByRole("button", { name: /^Kenmore/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Kenmore" })).toBeInViewport();
  await expect(sheet.getByRole("heading", { name: s.trains })).toBeInViewport();
});
