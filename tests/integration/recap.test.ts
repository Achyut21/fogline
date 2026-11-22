import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { recapByInvite, recapForPlan } from "@/server/actions/recap";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import { planParticipants, planStops, plans, profiles } from "@/server/db/schema";
import { seedDemo } from "@/server/demo";
import { recapOf } from "@/server/recap";
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

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("night recap", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let maya: Profile;
  let planId = "";
  let token = "";

  async function realProfile(name: string, ageBand: "under21" | "21plus", code: string) {
    const [row] = await db
      .insert(profiles)
      .values({
        displayName: name,
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand,
        profileCode: code,
      })
      .returning();
    return row;
  }

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const { profileId } = await seedDemo(db, new Date("2026-11-22T05:00:00Z"));
    [maya] = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const [plan] = await db.select().from(plans).where(eq(plans.createdBy, profileId));
    planId = plan.id;
    token = plan.inviteToken;
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F9.1] gives the arrival order, badges, numbers, routes and the fog cleared", async () => {
    const recap = await recapOf(db, planId);
    if (!recap) throw new Error("expected a recap");
    expect(recap.arrivals.map((a) => a.name)).toEqual(["Maya", "Priya", "Sam"]);
    expect(recap.badges.map((b) => `${b.name} ${b.badge}`).sort()).toEqual([
      "Maya first-in",
      "Maya long-haul",
      "Maya planner",
      "Priya on-the-dot",
      "Sam fashionably-late",
    ]);
    expect(recap.routes.map((r) => r.name).sort()).toEqual(["Maya", "Priya", "Sam"]);
    expect(recap.routes.every((r) => r.minutes > 0 && r.steps.length > 0)).toBe(true);
    expect(recap.numbers.milesWalked).toBeGreaterThan(0);
    expect(recap.numbers.newCells).toBe(recap.clearedCells.length);
    expect(recap.numbers.newCells).toBeGreaterThan(0);
  });

  it("[F9.1] draws no route for someone who said yes and never came", async () => {
    const [ghost] = await db
      .insert(profiles)
      .values({
        displayName: "Lee",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "21plus",
        profileCode: "LEEX2345",
        isDemo: true,
      })
      .returning();
    await db.insert(planParticipants).values({ planId, profileId: ghost.id, rsvp: "yes" });
    const recap = await recapOf(db, planId);
    expect(recap?.routes.map((r) => r.name)).not.toContain("Lee");
  });

  it("[F9.4] shows the recap to members and token holders, routes to members only", async () => {
    session.viewer = maya;
    expect((await recapForPlan(planId))?.routes.length).toBe(3);
    expect((await recapByInvite(token))?.routes.length).toBe(3);
    const outsider = { ...(await realProfile("Alex", "21plus", "ALEX2345")), isDemo: true };
    session.viewer = outsider;
    expect(await recapForPlan(planId)).toBeNull();
    const viaLink = await recapByInvite(token);
    expect(viaLink?.arrivals.length).toBe(3);
    expect(viaLink?.routes).toEqual([]);
    expect(viaLink?.clearedCells).toEqual([]);
    session.viewer = null;
    expect(await recapForPlan(planId)).toBeNull();
    expect(await recapByInvite("not-a-token")).toBeNull();
  });

  it("[F16.2] keeps a demo night's recap from real profiles", async () => {
    session.viewer = await realProfile("Real", "21plus", "REAL2345");
    expect(await recapByInvite(token)).toBeNull();
  });

  it("[F4.9] hides a bar from anyone not known to be 21+, and an open plan has no recap", async () => {
    const bar = data.places().find((p) => p.ageRule === "21plus" && p.stations.length > 0);
    if (!bar) throw new Error("no 21+ spot");
    await db
      .update(planStops)
      .set({ placeId: bar.id, stationId: bar.stations[0].id })
      .where(eq(planStops.planId, planId));
    session.viewer = { ...maya, ageBand: "under21" };
    expect((await recapForPlan(planId))?.spot).toBeNull();
    // The title can name the bar, so it's hidden with it.
    expect((await recapForPlan(planId))?.title).toBeNull();
    session.viewer = { ...maya, ageBand: "21plus" };
    expect((await recapForPlan(planId))?.spot?.id).toBe(bar.id);
    await db.update(plans).set({ status: "live", endedAt: null }).where(eq(plans.id, planId));
    expect(await recapForPlan(planId)).toBeNull();
  });
});
