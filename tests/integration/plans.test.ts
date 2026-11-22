import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { checkIn } from "@/server/actions/live";
import { findMeetup } from "@/server/actions/core-loop";
import { createPlan, joinPlan, planByInvite } from "@/server/actions/plans";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import { checkins, profiles } from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

type Profile = typeof profiles.$inferSelect;

const session = vi.hoisted(() => ({ db: null as unknown, viewer: null as Profile | null }));

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
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("plan Server Actions", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  const people: Record<"adult" | "teen" | "stranger", Profile | null> = {
    adult: null,
    teen: null,
    stranger: null,
  };

  const home = stationById("place-kencl");
  const bar = data.places().find((p) => p.ageRule === "21plus" && p.stations.length > 0);
  const cafe = data.places().find((p) => p.ageRule === "all" && p.stations.length > 0);

  async function profile(name: string, ageBand: "under21" | "21plus") {
    if (!home) throw new Error("Kenmore missing from data/stations.json");
    const { id } = await insertProfile(db, { name, school: "Boston University", home, ageBand });
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row;
  }

  async function planAt(spot: NonNullable<typeof bar>) {
    session.viewer = people.adult;
    const made = await createPlan({
      title: "Friday",
      startsAt: new Date().toISOString(),
      friends: [{ name: "Sam", station: "place-harsq" }],
      stop: { placeId: spot.id, stationId: spot.stations[0].id },
    });
    if (made.kind !== "created") throw new Error(`expected created, got ${made.kind}`);
    return made;
  }

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    people.adult = await profile("Priya", "21plus");
    people.teen = await profile("Maya", "under21");
    people.stranger = await profile("Alex", "21plus");
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F4.9] refuses a 21+ spot from an under-21 creator", async () => {
    if (!bar) throw new Error("no 21+ place in data/places.json");
    session.viewer = people.teen;
    const made = await createPlan({
      title: "Friday",
      startsAt: new Date().toISOString(),
      friends: [],
      stop: { placeId: bar.id, stationId: bar.stations[0].id },
    });
    expect(made).toEqual({ kind: "adults-only" });
  });

  it("[F4.9] hides a 21+ plan's venue from an under-21 profile and refuses its join", async () => {
    if (!bar) throw new Error("no 21+ place in data/places.json");
    const { inviteToken } = await planAt(bar);
    session.viewer = people.teen;
    const seen = await planByInvite(inviteToken);
    expect(seen).toMatchObject({ adultsOnly: true, spot: null, station: null });
    expect(await joinPlan(inviteToken)).toEqual({ kind: "adults-only" });
    session.viewer = people.stranger;
    expect((await planByInvite(inviteToken))?.spot?.id).toBe(bar.id);
  });

  it("[F4.8] shows names and count but no home stations to someone who isn't in the plan", async () => {
    if (!cafe) throw new Error("no all-ages place in data/places.json");
    const { inviteToken } = await planAt(cafe);
    session.viewer = people.stranger;
    const outside = await planByInvite(inviteToken);
    expect(outside?.people.map((p) => p.name).sort()).toEqual(["Priya", "Sam"]);
    expect(outside?.people.every((p) => p.station === null && p.leaveBy === null)).toBe(true);

    expect(await joinPlan(inviteToken)).toMatchObject({ kind: "joined" });
    expect(await joinPlan(inviteToken)).toMatchObject({ kind: "joined" });
    const inside = await planByInvite(inviteToken);
    expect(inside?.people).toHaveLength(3);
    expect(inside?.people.find((p) => p.name === "Alex")?.station).toBe("place-kencl");
  });

  it("[F6.2] refuses a check-in from someone who isn't in the plan and stores nothing", async () => {
    if (!cafe) throw new Error("no all-ages place in data/places.json");
    const { id } = await planAt(cafe);
    session.viewer = people.stranger;
    const result = await checkIn({ planId: id, lat: cafe.lat, lon: cafe.lon, accuracyM: 10 });
    expect(result).toEqual({ valid: false, reason: "not-found" });
    expect(await db.select().from(checkins).where(eq(checkins.planId, id))).toEqual([]);
  });

  it("[F1.5] takes the age rule from the profile, not the request", async () => {
    session.viewer = people.teen;
    const result = await findMeetup({
      people: [
        { name: "Maya", station: "place-kencl" },
        { name: "Sam", station: "place-harsq" },
      ],
      startsAt: "2026-11-27T19:00:00-05:00",
      categories: ["bar"],
      budget: null,
      minGrade: null,
      under21: false,
    });
    expect(result.kind).not.toBe("options");
  });
});
