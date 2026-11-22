import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { recordNoise } from "@/server/actions/noise";
import { createDb, type Db } from "@/server/db/client";
import { noiseReadings } from "@/server/db/schema";
import { sensoryPreview } from "@/server/noise";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const session = vi.hoisted(() => ({ db: null as unknown, viewer: null as string | null }));

vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => session.viewer,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("calm mode readings", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let profileId: string;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const home = stationById("place-pktrm");
    if (!home) throw new Error("Park Street missing");
    ({ id: profileId } = await insertProfile(db, {
      name: "Maya",
      school: "Boston University",
      home,
      ageBand: "under21",
    }));
    session.viewer = profileId;
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F13.1] [F13.2] stores two numbers for a real segment, once a minute", async () => {
    const reading = {
      route: "Green-D",
      from: "place-kencl",
      to: "place-fenwy",
      dbAvg: -38.5,
      dbPeak: -21,
    };
    expect(await recordNoise({ ...reading, to: "place-rsmnl" })).toEqual({
      kind: "rejected",
      reason: "segment",
    });
    expect(await recordNoise(reading)).toEqual({ kind: "recorded" });
    expect(await recordNoise(reading)).toEqual({ kind: "rejected", reason: "too-soon" });
    const rows = await db.select().from(noiseReadings);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["dbAvg", "dbPeak", "fromStopId", "isDemo", "profileId", "routeId", "toStopId", "ts"].sort(),
    );
  });

  it("[F13.5] previews a station's sound against other segments, and says when there's no data", async () => {
    const at = new Date(Date.now() - 2 * 60 * 60_000);
    await db.insert(noiseReadings).values(
      [
        ["place-fenwy", "place-longw", -60],
        ["place-longw", "place-bvmnl", -55],
        ["place-bvmnl", "place-brkhl", -30],
        ["place-brkhl", "place-bcnfd", -28],
      ].map(([from, to, level]) => ({
        ts: at,
        profileId,
        routeId: "Green-D",
        fromStopId: String(from),
        toStopId: String(to),
        dbAvg: Number(level),
        dbPeak: Number(level) + 5,
      })),
    );
    const quiet = await sensoryPreview(db, "place-longw");
    expect(quiet.sound?.loudness).toBe("quieter");
    expect(quiet.quietestHour).not.toBeNull();
    expect((await sensoryPreview(db, "place-brkhl")).sound?.loudness).toBe("louder");
    expect(await sensoryPreview(db, "place-alfcl")).toEqual({ sound: null, quietestHour: null });
  });

  it("[F13.1] stores one reading when two are sent at once", async () => {
    const other = stationById("place-pktrm");
    if (!other) throw new Error("Park Street missing");
    const { id } = await insertProfile(db, {
      name: "Sam",
      school: "Tufts",
      home: other,
      ageBand: "under21",
    });
    session.viewer = id;
    const reading = {
      route: "Green-D",
      from: "place-fenwy",
      to: "place-longw",
      dbAvg: -40,
      dbPeak: -30,
    };
    const results = await Promise.all([
      recordNoise(reading),
      recordNoise(reading),
      recordNoise(reading),
    ]);
    expect(results.filter((r) => r.kind === "recorded")).toHaveLength(1);
  });
});
