import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPlan, joinPlan, planByInvite } from "@/server/actions/plans";
import { deleteMyData, updateAgeBand } from "@/server/actions/profile";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import {
  noiseReadings,
  profiles,
  puzzleResults,
  revealedCells,
  rideEvents,
} from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

type Profile = typeof profiles.$inferSelect;

const session = vi.hoisted(() => ({
  db: null as unknown,
  viewer: null as Profile | null,
  ended: 0,
}));

vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/profile", async (original) => ({
  ...(await original<typeof import("@/server/profile")>()),
  currentProfile: async () => session.viewer,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => session.viewer?.id ?? null,
  endSession: async () => {
    session.ended += 1;
  },
}));
vi.mock("@/server/alerts", async (original) => ({
  ...(await original<typeof import("@/server/alerts")>()),
  currentAlerts: async () => [],
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("settings", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  const home = stationById("place-kencl");
  const cafe = data.places().find((p) => p.ageRule === "all" && p.stations.length > 0);

  async function profile(name: string) {
    if (!home) throw new Error("Kenmore missing");
    const { id } = await insertProfile(db, {
      name,
      school: "Boston University",
      home,
      ageBand: "under21",
    });
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row;
  }

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F1.5] changes the age band from Settings", async () => {
    session.viewer = await profile("Ana");
    expect(await updateAgeBand("21plus")).toEqual({ kind: "saved" });
    const [row] = await db.select().from(profiles).where(eq(profiles.id, session.viewer.id));
    expect(row.ageBand).toBe("21plus");
    await expect(updateAgeBand("ancient")).rejects.toThrow();
  });

  it("[F1.7] deletes a profile and its data, and shows it as a former member in shared plans", async () => {
    if (!cafe) throw new Error("no all-ages spot");
    const organizer = await profile("Maya");
    const leaving = await profile("Sam");
    session.viewer = organizer;
    const made = await createPlan({
      title: "Friday",
      startsAt: new Date().toISOString(),
      friends: [],
      stop: { placeId: cafe.id, stationId: cafe.stations[0].id },
    });
    if (made.kind !== "created") throw new Error(`expected created, got ${made.kind}`);
    session.viewer = leaving;
    expect(await joinPlan(made.inviteToken)).toMatchObject({ kind: "joined" });

    const now = new Date();
    await db.insert(rideEvents).values({
      ts: now,
      profileId: leaving.id,
      tripId: "t1",
      routeId: "Green-D",
      stopId: "place-kencl",
      event: "board",
      isReplay: true,
    });
    await db.insert(noiseReadings).values({
      ts: now,
      profileId: leaving.id,
      routeId: "Green-D",
      fromStopId: "place-kencl",
      toStopId: "place-fenwy",
      dbAvg: -40,
      dbPeak: -30,
    });
    await db
      .insert(puzzleResults)
      .values({ profileId: leaving.id, date: "2026-11-22", guesses: ["crane"] });

    await expect(deleteMyData()).rejects.toThrow("redirect /welcome");
    for (const table of [rideEvents, noiseReadings, puzzleResults]) {
      expect(await db.select().from(table).where(eq(table.profileId, leaving.id))).toEqual([]);
    }
    expect(session.ended).toBe(1);
    expect(await db.select().from(profiles).where(eq(profiles.id, leaving.id))).toEqual([]);
    expect(
      await db.select().from(revealedCells).where(eq(revealedCells.profileId, leaving.id)),
    ).toEqual([]);

    session.viewer = organizer;
    const plan = await planByInvite(made.inviteToken);
    const former = plan?.people.find((p) => p.former);
    expect(former).toMatchObject({ name: null, station: null, placeholder: false });
    expect(plan?.people.map((p) => p.name)).toContain("Maya");
  });
});
