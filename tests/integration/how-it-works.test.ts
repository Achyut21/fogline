import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { sql } from "drizzle-orm";
import {
  checkins,
  noiseReadings,
  plans,
  profiles,
  rideEvents,
  vehiclePositions,
} from "@/server/db/schema";
import { cachedHowItWorks, howItWorks, nextFridayEvening } from "@/server/how-it-works";
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
    const ride = (isDemo: boolean) => ({
      ts: new Date(),
      profileId: me.id,
      routeId: "Red",
      event: "board" as const,
      isDemo,
    });
    await db.insert(rideEvents).values([ride(false), ride(true)]);
    const noise = (isDemo: boolean) => ({
      ts: new Date(),
      profileId: me.id,
      routeId: "Red",
      fromStopId: "place-pktrm",
      toStopId: "place-dwnxg",
      dbAvg: 70,
      dbPeak: 85,
      isDemo,
    });
    await db.insert(noiseReadings).values([noise(false), noise(true), noise(true)]);
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
      ride_events: 1,
      noise_readings: 1,
    });
    expect(numbers.lastRecorderRun?.toISOString()).toBe("2026-11-22T05:00:00.000Z");
    expect(numbers.compressionRatio).toBeNull();
    expect(numbers.solverMs).toEqual(expect.any(Number));
  });

  it("[F15.1] gives the compression ratio once a chunk is in the columnstore", async () => {
    await db.insert(vehiclePositions).values(
      Array.from({ length: 500 }, (_, i) => ({
        ts: new Date(Date.UTC(2026, 9, 1, 0, 0, i)),
        vehicleId: "R-2",
        routeId: "Red",
        lat: 42.36,
        lon: -71.06,
      })),
    );
    await db.execute(
      sql`do $$ declare c regclass; begin
        for c in select show_chunks('vehicle_positions', older_than => interval '30 days') loop
          call convert_to_columnstore(c);
        end loop;
      end $$`,
    );
    const numbers = await howItWorks(db);
    expect(numbers.compressionRatio).toBeGreaterThan(1);
  });

  it("[F15.1] times the solver on next Friday at 7 PM New York time", () => {
    expect(nextFridayEvening(new Date("2026-11-22T05:00:00Z")).toISOString()).toBe(
      "2026-11-28T00:00:00.000Z",
    );
    expect(nextFridayEvening(new Date("2026-11-28T01:00:00Z")).toISOString()).toBe(
      "2026-12-05T00:00:00.000Z",
    );
  });

  it("[F15.2] serves the same numbers for 60 s, then queries again", async () => {
    const first = await cachedHowItWorks(db, 1_000_000);
    expect(await cachedHowItWorks(db, 1_059_000)).toBe(first);
    expect(await cachedHowItWorks(db, 1_061_000)).not.toBe(first);
  });
});
