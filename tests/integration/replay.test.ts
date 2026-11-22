import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cellOf } from "@/lib/geo/cells";
import { recordReplayStop } from "@/server/actions/ride";
import { createDb, type Db } from "@/server/db/client";
import { profiles, revealedCells, rideEvents, vehiclePositions } from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { data } from "@/server/data";
import { recordedRides } from "@/server/replay";
import { stationById } from "@/server/stations";
import { recordedTripRows } from "../support/recorded-trip";
import { createScratchDatabase } from "./scratch-database";

type Profile = typeof profiles.$inferSelect;

const session = vi.hoisted(() => ({ db: null as unknown, viewer: null as Profile | null }));

vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => session.viewer?.id ?? null,
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const greenD = data.shapes().find((s) => s.route === "Green-D" && s.direction === 0);

describe.skipIf(testUrl === "")("ride replay", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  const now = new Date();

  beforeAll(async () => {
    if (!greenD) throw new Error("Green-D westbound missing from data/shapes.json");
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const home = stationById("place-pktrm");
    if (!home) throw new Error("Park Street missing");
    const { id } = await insertProfile(db, {
      name: "Maya",
      school: "Boston University",
      home,
      ageBand: "under21",
    });
    [session.viewer] = await db.select().from(profiles).where(eq(profiles.id, id));
    const hourAgo = new Date(now.getTime() - 60 * 60_000);
    // Kenmore (7580 m) to Reservoir (13086 m) in 10 minutes, and a short hop that's too short.
    await db.insert(vehiclePositions).values([
      ...recordedTripRows(greenD, {
        id: "trip-long",
        start: hourAgo,
        fromM: 7400,
        toM: 13086,
        minutes: 10,
      }),
      ...recordedTripRows(greenD, {
        id: "trip-short",
        start: hourAgo,
        fromM: 7400,
        toM: 9120,
        minutes: 3,
      }),
      // The same trip ID ran yesterday too, past Kenmore to Beaconsfield.
      ...recordedTripRows(greenD, {
        id: "trip-daily",
        start: new Date(now.getTime() - 23 * 60 * 60_000),
        fromM: 7400,
        toM: 12445,
        minutes: 9,
      }),
      // Today's run is still between Kenmore and Longwood.
      ...recordedTripRows(greenD, {
        id: "trip-daily",
        start: new Date(now.getTime() - 3 * 60_000),
        fromM: 7400,
        toM: 9120,
        minutes: 3,
      }),
    ]);
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F3.5] lists recorded trips from a station that pass at least three more stops", async () => {
    const rides = await recordedRides(db, "place-kencl", now);
    expect(rides.map((r) => r.tripId)).toEqual(["trip-long"]);
    const [ride] = rides;
    expect(ride.stops[0]).toMatchObject({ station: "place-kencl", event: "board" });
    expect(ride.stops.at(-1)).toMatchObject({ station: "place-rsmnl", event: "alight" });
    expect(ride.stops.map((s) => s.station)).toContain("place-bcnfd");
    expect(ride.miles).toBeGreaterThan(3);
    expect(ride.miles).toBeLessThan(4);
  });

  it("[F3.5] keeps only the latest run of a trip ID that repeats each day", async () => {
    const rides = await recordedRides(db, "place-kencl", now);
    expect(rides.map((r) => r.tripId)).not.toContain("trip-daily");
  });

  it("[F3.8] [F3.3] records each replayed stop as a replay event and clears its cells", async () => {
    const first = await recordReplayStop({ tripId: "trip-long", from: "place-kencl", index: 0 });
    const second = await recordReplayStop({ tripId: "trip-long", from: "place-kencl", index: 1 });
    expect(first.kind).toBe("recorded");
    const events = await db.select().from(rideEvents);
    expect(events.map((e) => [e.stopId, e.event, e.isReplay])).toEqual([
      ["place-kencl", "board", true],
      ["place-fenwy", "pass", true],
    ]);
    const fenway = stationById("place-fenwy");
    if (!fenway || second.kind !== "recorded") throw new Error("no Fenway reveal");
    expect(second.newCells).toContain(cellOf(fenway));
    const [cell] = await db
      .select()
      .from(revealedCells)
      .where(eq(revealedCells.h3, cellOf(fenway)));
    expect(cell).toMatchObject({ state: "seen", source: "ride" });
  });

  it("[F16.2] marks a demo profile's replayed stops as demo, so real counts leave them out", async () => {
    const viewer = session.viewer;
    if (!viewer) throw new Error("no viewer");
    await db.update(profiles).set({ isDemo: true }).where(eq(profiles.id, viewer.id));
    await recordReplayStop({ tripId: "trip-long", from: "place-kencl", index: 2 });
    await db.update(profiles).set({ isDemo: false }).where(eq(profiles.id, viewer.id));
    const events = await db.select().from(rideEvents);
    const demoStop = events.filter((e) => e.isDemo);
    expect(demoStop).toHaveLength(1);
    expect(demoStop[0].stopId).not.toBe("place-kencl");
    expect(events.filter((e) => !e.isDemo).map((e) => e.stopId)).toEqual([
      "place-kencl",
      "place-fenwy",
    ]);
  });

  it("[F3.8] refuses a stop the recorded trip never reached", async () => {
    expect(await recordReplayStop({ tripId: "trip-long", from: "place-kencl", index: 40 })).toEqual(
      {
        kind: "not-found",
      },
    );
    expect(await recordReplayStop({ tripId: "nope", from: "place-kencl", index: 0 })).toEqual({
      kind: "not-found",
    });
  });
});
