import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { planParticipants, planStops, plans, profiles, weeklyPlans } from "@/server/db/schema";
import { copyWeeklyPlan, makeWeeklyPlans, weeklyPlansFor } from "@/server/weekly";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const monday6am = new Date("2026-11-23T06:00:00-05:00");

describe.skipIf(testUrl === "")("weekly plans", () => {
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

  it("[F10.4] stores the week's plans once, however often the cron runs", async () => {
    expect(await makeWeeklyPlans(db, monday6am)).toBe(3);
    expect(await makeWeeklyPlans(db, monday6am)).toBe(0);
    expect(await db.select().from(weeklyPlans)).toHaveLength(3);
    const shown = await weeklyPlansFor(db, new Date("2026-11-25T12:00:00-05:00"));
    expect(shown).toHaveLength(3);
    expect(shown[0].title).toMatch(/^Dinner before /);
    expect(shown[0].stops.at(-1)?.category).toBe("event");
    expect(shown.slice(1).map((p) => p.title)).toEqual([
      "Dinner and dessert",
      "Coffee and a museum",
    ]);
    expect(await weeklyPlansFor(db, new Date("2026-12-01T12:00:00-05:00"))).toEqual([]);
  });

  it("[F10.5] copies a weekly plan into the viewer's own crawl with its own invite link", async () => {
    const [maya] = await db
      .insert(profiles)
      .values({
        displayName: "Maya",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "under21",
        profileCode: "MAYA2345",
      })
      .returning();
    const [weekly] = await weeklyPlansFor(db, monday6am);
    const first = await copyWeeklyPlan(db, weekly.id, maya);
    const second = await copyWeeklyPlan(db, weekly.id, maya);
    if (!first || !second) throw new Error("expected copies");
    expect(first.inviteToken).not.toBe(second.inviteToken);
    expect(first.inviteToken).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);

    const [plan] = await db.select().from(plans).where(eq(plans.id, first.id));
    expect(plan).toMatchObject({
      kind: "crawl",
      status: "planned",
      createdBy: maya.id,
      isDemo: false,
    });
    expect(plan.title).toBe(weekly.title);
    const seats = await db
      .select()
      .from(planParticipants)
      .where(eq(planParticipants.planId, first.id));
    expect(seats.map((s) => [s.profileId, s.rsvp])).toEqual([[maya.id, "yes"]]);
    const stops = await db.select().from(planStops).where(eq(planStops.planId, first.id));
    expect(stops.map((s) => s.placeId)).toEqual(weekly.stops.map((s) => s.id));
    expect(stops.map((s) => s.walkedFromPrevious)).toEqual(
      weekly.stops.map((s) => s.leg?.mode === "walk"),
    );
    expect(await copyWeeklyPlan(db, crypto.randomUUID(), maya)).toBeNull();
  });
});
