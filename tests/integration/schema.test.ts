import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import {
  ageBands,
  badgesAwarded,
  cellSources,
  cellStates,
  minGrades,
  planKinds,
  planParticipants,
  planStatuses,
  plans,
  profiles,
  puzzleResults,
  revealedCells,
  rsvps,
  themePrefs,
  vibes,
} from "@/server/db/schema";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const violates = (constraint: string) => ({ cause: { constraint_name: constraint } });

describe.skipIf(testUrl === "")("core tables", () => {
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

  let codes = 0;
  async function newProfile(name: string) {
    codes += 1;
    const [row] = await db
      .insert(profiles)
      .values({
        displayName: name,
        school: "Tufts",
        homeStationId: "place-mdftf",
        ageBand: "21plus",
        profileCode: `CODE${String(codes).padStart(4, "0")}`,
      })
      .returning();
    if (!row) throw new Error("profile insert returned nothing");
    return row;
  }

  async function newPlan(createdBy: string) {
    const [row] = await db
      .insert(plans)
      .values({
        createdBy,
        kind: "meetup",
        title: "Friday dinner",
        startsAt: new Date("2026-11-20T23:00:00Z"),
        inviteToken: crypto.randomUUID(),
      })
      .returning();
    if (!row) throw new Error("plan insert returned nothing");
    return row;
  }

  it("[F8.6] stores an explorer badge, whose plan is null, only once per profile and scope", async () => {
    const sam = await newProfile("Sam");
    const firstLight = { profileId: sam.id, badgeId: "first-light", scope: "Back Bay" };
    await db.insert(badgesAwarded).values(firstLight);
    await expect(db.insert(badgesAwarded).values(firstLight)).rejects.toMatchObject(
      violates("badges_awarded_once"),
    );

    await db.insert(badgesAwarded).values({ ...firstLight, scope: "Fenway" });
    await db.insert(badgesAwarded).values({ profileId: sam.id, badgeId: "all-four-lines" });
    await expect(
      db.insert(badgesAwarded).values({ profileId: sam.id, badgeId: "all-four-lines" }),
    ).rejects.toMatchObject(violates("badges_awarded_once"));

    const inserted = await db.insert(badgesAwarded).values(firstLight).onConflictDoNothing();
    expect(inserted.count).toBe(0);
    const rows = await db.select().from(badgesAwarded).where(eq(badgesAwarded.profileId, sam.id));
    expect(rows).toHaveLength(3);
  });

  it("[F8.6] stores a night badge once per plan", async () => {
    const priya = await newProfile("Priya");
    const plan = await newPlan(priya.id);
    const firstIn = { profileId: priya.id, badgeId: "first-in", planId: plan.id };
    await db.insert(badgesAwarded).values(firstIn);
    await expect(db.insert(badgesAwarded).values(firstIn)).rejects.toMatchObject(
      violates("badges_awarded_once"),
    );

    const other = await newPlan(priya.id);
    await db.insert(badgesAwarded).values({ ...firstIn, planId: other.id });
  });

  it("accepts every value in each column's list and rejects one outside it", async () => {
    const leo = await newProfile("Leo");
    const plan = await newPlan(leo.id);
    await db.insert(planParticipants).values({ planId: plan.id, profileId: leo.id });
    await db
      .insert(revealedCells)
      .values({ profileId: leo.id, h3: "892a3066a43ffff", state: "seen", source: "home" });

    const cases: [string, string, readonly string[], string, string][] = [
      ["profiles", "age_band", ageBands, "adult", "profiles_age_band"],
      ["profiles", "theme_pref", themePrefs, "sepia", "profiles_theme_pref"],
      ["plans", "kind", planKinds, "party", "plans_kind"],
      ["plans", "vibe", vibes, "loud", "plans_vibe"],
      ["plans", "min_grade", minGrades, "C", "plans_min_grade"],
      ["plan_participants", "rsvp", rsvps, "maybe", "plan_participants_rsvp"],
      ["revealed_cells", "state", cellStates, "cleared", "revealed_cells_state"],
      ["revealed_cells", "source", cellSources, "bus", "revealed_cells_source"],
    ];
    for (const [table, column, allowed, outside, constraint] of cases) {
      for (const value of allowed) {
        await db.execute(sql.raw(`update ${table} set ${column} = '${value}'`));
      }
      await expect(
        db.execute(sql.raw(`update ${table} set ${column} = '${outside}'`)),
      ).rejects.toMatchObject(violates(constraint));
    }

    for (const status of planStatuses) {
      const endedAt = status === "ended" ? "now()" : "null";
      await db.execute(sql.raw(`update plans set status = '${status}', ended_at = ${endedAt}`));
    }
    await expect(
      db.execute(sql.raw(`update plans set status = 'cancelled', ended_at = null`)),
    ).rejects.toMatchObject(violates("plans_status"));
    await db.execute(sql.raw(`update plans set budget = 3`));
    await expect(db.execute(sql.raw(`update plans set budget = 4`))).rejects.toMatchObject(
      violates("plans_budget"),
    );
  });

  it("keeps a plan's status and its end time in step", async () => {
    const sam = await newProfile("Sam");
    const plan = await newPlan(sam.id);
    await expect(
      db.update(plans).set({ status: "ended" }).where(eq(plans.id, plan.id)),
    ).rejects.toMatchObject(violates("plans_ended"));
    await expect(
      db.update(plans).set({ endedAt: new Date() }).where(eq(plans.id, plan.id)),
    ).rejects.toMatchObject(violates("plans_ended"));
    await db
      .update(plans)
      .set({ status: "ended", endedAt: new Date("2026-11-21T03:00:00Z") })
      .where(eq(plans.id, plan.id));
  });

  it("keeps a puzzle result's solved flag and solve time in step", async () => {
    const leo = await newProfile("Leo");
    await expect(
      db.insert(puzzleResults).values({ profileId: leo.id, date: "2026-11-21", solved: true }),
    ).rejects.toMatchObject(violates("puzzle_results_solved"));
    await expect(
      db.insert(puzzleResults).values({
        profileId: leo.id,
        date: "2026-11-21",
        solved: false,
        solvedAt: new Date("2026-11-21T14:00:00Z"),
      }),
    ).rejects.toMatchObject(violates("puzzle_results_solved"));
    await db.insert(puzzleResults).values({
      profileId: leo.id,
      date: "2026-11-21",
      solved: true,
      solvedAt: new Date("2026-11-21T14:00:00Z"),
    });
  });

  it("seats a profile once per plan, and placeholders only with a name and a station", async () => {
    const maya = await newProfile("Maya");
    const plan = await newPlan(maya.id);
    await db.insert(planParticipants).values({ planId: plan.id, profileId: maya.id });
    await expect(
      db.insert(planParticipants).values({ planId: plan.id, profileId: maya.id }),
    ).rejects.toMatchObject(violates("plan_participants_plan_profile"));

    await db
      .insert(planParticipants)
      .values([
        { planId: plan.id, placeholderName: "Priya", originStationId: "place-harsq" },
        { planId: plan.id, placeholderName: "Sam", originStationId: "place-mdftf" },
        { planId: plan.id },
        { planId: plan.id },
      ]);
    await expect(
      db.insert(planParticipants).values({ planId: plan.id, placeholderName: "Leo" }),
    ).rejects.toMatchObject(violates("plan_participants_seat"));
    const leo = await newProfile("Leo");
    await expect(
      db
        .insert(planParticipants)
        .values({ planId: plan.id, profileId: leo.id, originStationId: "place-nuniv" }),
    ).rejects.toMatchObject(violates("plan_participants_seat"));
  });

  it("deletes a profile's own rows and keeps shared plans, with no name or station on its seat", async () => {
    const maya = await newProfile("Maya");
    const priya = await newProfile("Priya");
    const plan = await newPlan(maya.id);
    await db.insert(planParticipants).values([
      { planId: plan.id, profileId: maya.id, rsvp: "yes" },
      { planId: plan.id, profileId: priya.id, rsvp: "yes" },
    ]);
    await db
      .insert(revealedCells)
      .values({ profileId: maya.id, h3: "892a3066a43ffff", state: "seen", source: "home" });
    await db.insert(puzzleResults).values({ profileId: maya.id, date: "2026-11-21" });
    await db
      .insert(badgesAwarded)
      .values({ profileId: maya.id, badgeId: "planner", planId: plan.id });

    await db.delete(profiles).where(eq(profiles.id, maya.id));

    const [kept] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(kept?.createdBy).toBeNull();
    const seats = await db
      .select({
        profileId: planParticipants.profileId,
        name: planParticipants.placeholderName,
        station: planParticipants.originStationId,
      })
      .from(planParticipants)
      .where(eq(planParticipants.planId, plan.id));
    expect(seats).toHaveLength(2);
    expect(seats).toEqual(
      expect.arrayContaining([
        { profileId: null, name: null, station: null },
        { profileId: priya.id, name: null, station: null },
      ]),
    );
    for (const table of [revealedCells, puzzleResults, badgesAwarded]) {
      const left = await db.select().from(table).where(eq(table.profileId, maya.id));
      expect(left).toEqual([]);
    }
  });
});
