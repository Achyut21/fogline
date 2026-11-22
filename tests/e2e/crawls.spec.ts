import { expect, test, type Page } from "@playwright/test";
import { map, onboarding as o, plans } from "@/copy";
import { puzzleFor } from "@/lib/puzzle";
import { calendarDateOf } from "@/lib/time";
import { data } from "@/server/data";

const b = plans.builder;

async function onboard(page: Page) {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill("Maya");
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: "Boston University" }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function addFriend(page: Page) {
  await page.getByLabel(b.friendName).fill("Sam");
  await page.getByLabel(b.friendStation).selectOption({ label: "Davis" });
}

test("[F10.1] [F10.3] builds a two-stop crawl and saves it as a plan", async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page);
  await page.goto("/plans/new");
  await addFriend(page);
  await page.getByRole("radio", { name: b.modes.crawl }).click();
  await page.getByLabel(b.crawl.stop(1)).selectOption({ label: map.sheet.category.food });
  await page.getByLabel(b.crawl.stop(2)).selectOption({ label: map.sheet.category.dessert });
  await page.getByRole("button", { name: b.find }).click();

  const first = page.getByRole("article").first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  await expect(first.getByRole("listitem").filter({ hasText: "Sam" })).toBeVisible();
  await first.getByRole("button", { name: b.choose }).click();

  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+\?t=/);
  await expect(page.getByRole("heading", { name: plans.plan.stops(2) })).toBeVisible();
});

const event = puzzleFor(data.events(), calendarDateOf(new Date()));

test("[F10.6] offers dinner before today's puzzle event", async ({ page }) => {
  test.skip(!event, "no puzzle event today");
  test.setTimeout(90_000);
  await onboard(page);
  await page.goto(`/plans/new?event=${event?.id}`);
  await expect(
    page.getByRole("heading", { name: b.dinner.offer(event?.title ?? "") }),
  ).toBeVisible();
  await addFriend(page);
  await page.getByRole("button", { name: b.dinner.find }).click();
  // A dinner, or the named reason none fits that night.
  const reasons = Object.values(b.crawl.blocker);
  await expect(
    page
      .getByRole("heading", { name: b.dinner.title, exact: true })
      .or(page.getByText(new RegExp(`^(${reasons.join("|")})$`))),
  ).toBeVisible({ timeout: 30_000 });
});
