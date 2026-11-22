import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { checkins, plans, profiles, vehiclePositions } from "@/server/db/schema";
import { cachedHowItWorks, howItWorks } from "@/server/how-it-works";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("How it works numbers", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    const [me] = await db
      .insert(profiles)
      .values({
        displayName: "Maya",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "21plus",
        profileCode: "MAYA2345",
      })
      .returning({ id: profiles.id });
    const [plan] = await db
      .insert(plans)
      .values({
        kind: "meetup",
        title: "Dinner",
        startsAt: new Date(),
        inviteToken: "how-it-works",
      })
      .returning({ id: plans.id });
    const row = (isDemo: boolean) => ({
      ts: new Date(),
      profileId: me.id,
      planId: plan.id,
      placeId: "osm:node/1",
      lat: 42.36,
      lon: -71.06,
      accuracyM: 10,
      valid: true,
      isDemo,
    });
    await db.insert(checkins).values([row(false), row(false), row(true)]);
    await db.insert(vehiclePositions).values({
      ts: new Date("2026-11-22T05:00:00Z"),
      vehicleId: "R-1",
      routeId: "Red",
      lat: 42.36,
      lon: -71.06,
    });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F15.1] counts the hypertables' rows without demo rows, with the last recorder run", async () => {
    const numbers = await howItWorks(db);
    expect(numbers.rows).toEqual({
      vehicle_positions: 1,
      checkins: 2,
      ride_events: 0,
      noise_readings: 0,
    });
    expect(numbers.lastRecorderRun?.toISOString()).toBe("2026-11-22T05:00:00.000Z");
    expect(numbers.compressionRatio).toBeNull();
    expect(numbers.solverMs).toBeGreaterThanOrEqual(0);
  });

  it("[F15.2] serves the same numbers for 60 s, then queries again", async () => {
    const first = await cachedHowItWorks(db, 1_000_000);
    expect(await cachedHowItWorks(db, 1_059_000)).toBe(first);
    expect(await cachedHowItWorks(db, 1_061_000)).not.toBe(first);
  });
});
