import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { badgesAwarded, checkins, plans, profiles } from "@/server/db/schema";
import { cleanupDemo, lastFridayEvening, seedDemo } from "@/server/demo";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe("demo seed", () => {
  it("[F16.1] sets the demo night on the last Friday at 7 PM, counted from a day back", () => {
    expect(lastFridayEvening(new Date("2026-11-22T05:00:00Z")).toISOString()).toBe(
      "2026-11-21T00:00:00.000Z",
    );
    expect(lastFridayEvening(new Date("2026-11-21T03:00:00Z")).toISOString()).toBe(
      "2026-11-14T00:00:00.000Z",
    );
  });
});

describe.skipIf(testUrl === "")("demo copies", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F16.1] [F16.2] gives each visit its own flagged copy of a finished night with badges", async () => {
    const now = new Date("2026-11-22T05:00:00Z");
    const first = await seedDemo(db, now);
    const second = await seedDemo(db, now);
    expect(first.profileId).not.toBe(second.profileId);
    const demoProfiles = await db.select().from(profiles).where(eq(profiles.isDemo, true));
    expect(demoProfiles).toHaveLength(6);
    const [plan] = await db.select().from(plans).where(eq(plans.createdBy, first.profileId));
    expect(plan).toMatchObject({ status: "ended", isDemo: true });
    const rows = await db.select().from(checkins).where(eq(checkins.planId, plan.id));
    expect(rows.every((c) => c.isDemo && c.valid)).toBe(true);
    const names = new Map(demoProfiles.map((p) => [p.id, p.displayName]));
    const badges = await db
      .select({ profileId: badgesAwarded.profileId, badge: badgesAwarded.badgeId })
      .from(badgesAwarded)
      .where(eq(badgesAwarded.planId, plan.id));
    expect(badges.map((b) => `${names.get(b.profileId)} ${b.badge}`).sort()).toEqual([
      "Priya on-the-dot",
      "Sam fashionably-late",
      "You first-in",
      "You long-haul",
      "You planner",
    ]);
  });

  it("[F16.2] deletes demo copies after 24 hours and leaves real profiles alone", async () => {
    const [real] = await db
      .insert(profiles)
      .values({
        displayName: "Real",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "21plus",
        profileCode: "REAL2345",
      })
      .returning({ id: profiles.id });
    const [realPlan] = await db
      .insert(plans)
      .values({
        createdBy: real.id,
        kind: "meetup",
        title: "Real night",
        startsAt: new Date("2026-11-01T23:00:00Z"),
        inviteToken: "real-night",
      })
      .returning({ id: plans.id });
    await db.insert(checkins).values({
      ts: new Date("2026-11-01T23:05:00Z"),
      profileId: real.id,
      planId: realPlan.id,
      placeId: "osm:node/1",
      lat: 42.36,
      lon: -71.06,
      accuracyM: 10,
      valid: true,
    });
    expect(await cleanupDemo(db, new Date())).toBe(0);
    const later = new Date(Date.now() + 25 * 3600 * 1000);
    expect(await cleanupDemo(db, later)).toBe(6);
    expect(await db.select().from(plans).where(eq(plans.isDemo, true))).toEqual([]);
    const left = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.id, [real.id]));
    expect(left).toHaveLength(1);
    expect(await db.select().from(plans).where(eq(plans.id, realPlan.id))).toHaveLength(1);
    expect(await db.select().from(checkins).where(eq(checkins.planId, realPlan.id))).toHaveLength(
      1,
    );
  });
});
