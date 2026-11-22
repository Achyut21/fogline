import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { recapForPlan } from "@/server/actions/recap";
import { createDb, type Db } from "@/server/db/client";
import { plans, profiles } from "@/server/db/schema";
import { seedDemo } from "@/server/demo";
import { recapOf } from "@/server/recap";
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

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("night recap", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let you = "";
  let planId = "";

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    you = (await seedDemo(db, new Date("2026-11-22T05:00:00Z"))).profileId;
    const [plan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.createdBy, you));
    planId = plan.id;
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F9.1] gives the arrival order, badges, numbers, routes and the fog cleared", async () => {
    const recap = await recapOf(db, planId);
    if (!recap) throw new Error("expected a recap");
    expect(recap.arrivals.map((a) => a.name)).toEqual(["You", "Priya", "Sam"]);
    expect(recap.badges.map((b) => `${b.name} ${b.badge}`).sort()).toEqual([
      "Priya on-the-dot",
      "Sam fashionably-late",
      "You first-in",
      "You long-haul",
      "You planner",
    ]);
    expect(recap.routes.map((r) => r.name).sort()).toEqual(["Priya", "Sam", "You"]);
    expect(recap.routes.every((r) => r.minutes > 0 && r.steps.length > 0)).toBe(true);
    expect(recap.numbers.milesWalked).toBeGreaterThan(0);
    expect(recap.numbers.newCells).toBe(recap.clearedCells.length);
    expect(recap.numbers.newCells).toBeGreaterThan(0);
  });

  it("[F9.4] shows the recap to someone who sat in the plan and to nobody else", async () => {
    session.viewer = you;
    expect((await recapForPlan(planId))?.planId).toBe(planId);
    const [stranger] = await db
      .insert(profiles)
      .values({
        displayName: "Alex",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "21plus",
        profileCode: "ALEX2345",
      })
      .returning({ id: profiles.id });
    session.viewer = stranger.id;
    expect(await recapForPlan(planId)).toBeNull();
    session.viewer = null;
    expect(await recapForPlan(planId)).toBeNull();
  });
});
