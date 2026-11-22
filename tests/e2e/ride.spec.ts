import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { map, onboarding as o, ride } from "@/copy";
import { createDb, type Db } from "@/server/db/client";
import { vehiclePositions } from "@/server/db/schema";
import { data } from "@/server/data";
import { recordedTripRows } from "../support/recorded-trip";

// The Phase 3 gate run (PHASES): onboard, open a station, replay a recorded train past three stops,
// read the summary, and find those stations uncovered on the map. The trip is seeded into the
// local test database the e2e server uses, so this spec never runs against a deployment.

const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const testUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST ?? "";
const greenD = data.shapes().find((s) => s.route === "Green-D" && s.direction === 0);

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

// The row's name is the station, then its line badges ("Longwood Green Line D In fog").
const stationRow = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name} (Green|Red|Orange|Blue|Mattapan)`) });

test.describe("ride replay", () => {
  test.skip(testUrl === "", "needs DATABASE_URL_TEST to seed a recorded trip");

  const tripId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let db: Db;

  test.beforeAll(async () => {
    db = createDb(testUrl);
    if (!greenD) throw new Error("Green-D westbound missing from data/shapes.json");
    // Kenmore (7580 m) past Fenway and Longwood to Brookline Village (10308 m), ten minutes ago.
    await db.insert(vehiclePositions).values(
      recordedTripRows(greenD, {
        id: tripId,
        start: new Date(Date.now() - 10 * 60_000),
        fromM: 7400,
        toM: 10500,
        minutes: 4,
      }),
    );
  });

  test.afterAll(async () => {
    await db.delete(vehiclePositions).where(eq(vehiclePositions.tripId, tripId));
    await db.$client.end();
  });

  test("[F3.3] [F3.4] [F3.5] [F3.8] replays a trip past three stops and clears their fog", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await onboard(page);

    await page.getByRole("radio", { name: map.view.list }).click();
    await expect(stationRow(page, "Longwood")).toContainText(map.list.fog);
    await stationRow(page, "Kenmore").click();
    await page.getByRole("dialog").getByRole("link", { name: ride.startFrom }).click();

    await expect(page.getByRole("heading", { name: ride.list.title("Kenmore") })).toBeVisible();
    await page.locator(`a[href^="/ride/${tripId}"]`).click();

    await expect(page.getByRole("heading", { level: 1, name: "Kenmore" })).toBeVisible();
    await expect(page.getByText(ride.replay.label, { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: ride.replay.speedOption(20) }).click();
    // The recorded trip passes a stop about every 80 s, about 4 s at 20x: wait for the whole
    // 4-minute recording (12 s) rather than the default 5 s.
    const replay = { timeout: 15_000 };
    await expect(page.getByRole("heading", { level: 1, name: "Fenway" })).toBeVisible(replay);
    await expect(page.getByRole("heading", { level: 1, name: "Longwood" })).toBeVisible(replay);

    await expect(page.getByRole("heading", { name: ride.summary.title })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(ride.summary.replayNote)).toBeVisible();
    await page.getByRole("link", { name: ride.summary.done }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("radio", { name: map.view.list }).click();
    for (const name of ["Fenway", "Longwood", "Brookline Village"]) {
      await expect(stationRow(page, name)).toContainText(map.list.uncovered);
    }
  });

  test("[F3.4] ends a replay early with reduced motion and shows the summary at once", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await onboard(page);
    await page.goto(`/ride/${tripId}?from=place-kencl`);
    await expect(page.getByRole("heading", { level: 1, name: "Kenmore" })).toBeInViewport();
    await page.getByRole("button", { name: ride.replay.end }).click();
    await expect(page.getByRole("heading", { name: ride.summary.title })).toBeInViewport();
    await expect(page.getByText(ride.summary.stops, { exact: true })).toBeInViewport();
    await expect(page.getByText(ride.summary.lines(1), { exact: true })).toBeInViewport();
  });
});
