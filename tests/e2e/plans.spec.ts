import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { display, onboarding as o, plans } from "@/copy";
import { createDb } from "@/server/db/client";
import { planStops, plans as planTable } from "@/server/db/schema";
import { data } from "@/server/data";

// The Phase 4 gate run (PHASES): build a plan with a placeholder friend, see fair options with
// leave-by times, make the plan, join it through the invite link in a second browser context,
// check in with a mocked location at the spot, and end the plan. Writes to the local test database.

const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const testUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST ?? "";
const b = plans.builder;
const p = plans.plan;

async function onboard(page: Page, name: string, school: string) {
  await page.goto("/welcome");
  await page.getByLabel(o.welcome.nameLabel).fill(name);
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: school }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("button", { name: o.next }).click();
  await page.getByRole("radio", { name: o.age.under21 }).click();
  await page.getByRole("button", { name: o.age.submit }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function newContext(browser: Browser, at?: { latitude: number; longitude: number }) {
  return browser.newContext(
    at ? { geolocation: { ...at, accuracy: 20 }, permissions: ["geolocation"] } : {},
  );
}

test.skip(testUrl === "", "needs DATABASE_URL_TEST to move the plan's start time");

test("[F1.4] [F4.1] [F4.4] [F5.2] [F4.8] [F6.2] [F6.3] [F6.4] plans a fair night, joins it and checks in", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await onboard(page, "Maya", "Boston University");

  await page.goto("/plans");
  await page.getByRole("link", { name: plans.list.new }).first().click();
  await page.getByLabel(b.friendName).fill("Sam");
  await page.getByLabel(b.friendStation).selectOption({ label: "Davis" });
  await page.getByRole("button", { name: b.find }).click();

  const options = page.getByRole("article");
  await expect(options.first()).toBeVisible({ timeout: 20_000 });
  const first = options.first();
  await expect(first.getByText("Maya", { exact: true })).toBeVisible();
  await expect(first.getByText("Sam", { exact: true })).toBeVisible();
  await expect(first.getByText(display.leaveBy).first()).toBeVisible();
  await first.getByRole("button", { name: b.choose }).click();

  await expect(page).toHaveURL(/\/p\/[0-9a-f-]+\?t=/);
  const url = new URL(page.url());
  const planId = url.pathname.split("/").at(-1) ?? "";
  await expect(page.getByRole("heading", { name: p.people })).toBeVisible();
  await expect(page.getByText(p.placeholder)).toBeVisible();

  // Start the plan now so live mode and check-in open.
  const db = createDb(testUrl);
  await db.update(planTable).set({ startsAt: new Date() }).where(eq(planTable.id, planId));
  const [stop] = await db.select().from(planStops).where(eq(planStops.planId, planId));
  await db.$client.end();
  const spot = data.places().find((x) => x.id === stop.placeId);
  if (!spot) throw new Error("plan spot missing from places.json");

  await page.reload();
  await expect(page.getByRole("heading", { name: p.live })).toBeVisible();

  // The organizer hasn't granted location: the primer explains it before the browser asks (F1.4).
  await page.getByRole("button", { name: p.checkIn }).click();
  await expect(page.getByRole("dialog", { name: p.primer.title })).toBeVisible();
  await page.getByRole("button", { name: p.primer.continue }).click();
  await expect(page.getByRole("dialog", { name: p.primer.title })).toBeHidden();

  const friend = await newContext(browser, { latitude: spot.lat, longitude: spot.lon });
  const sam = await friend.newPage();
  await onboard(sam, "Sam", "Tufts");
  await sam.goto(`${url.pathname}${url.search}`);
  await expect(sam.getByText(p.leaveByHidden)).toBeVisible();
  await sam.getByRole("button", { name: p.join }).click();
  await expect(sam.getByRole("heading", { name: p.live })).toBeVisible();
  await sam.getByRole("button", { name: p.checkIn }).click();
  await expect(sam.getByText(p.checkedIn)).toBeVisible({ timeout: 15_000 });
  await expect(
    sam.getByRole("list", { name: p.arrivals }).getByText("Sam", { exact: true }),
  ).toBeVisible();
  // The organizer's open page picks up Sam's arrival within 10 s, without a reload (F6.3).
  await expect(
    page.getByRole("list", { name: p.arrivals }).getByText("Sam", { exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await friend.close();
  await page.getByRole("button", { name: p.end }).click();
  await expect(page.getByText(p.ended)).toBeVisible();
});
