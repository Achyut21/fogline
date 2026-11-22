import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { profiles, revealedCells } from "@/server/db/schema";
import { seedDemo } from "@/server/demo";
import { squadOf } from "@/server/squad";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const seededAt = new Date("2026-11-22T05:00:00Z");

describe.skipIf(testUrl === "")("squad", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let maya = "";
  let outsiders: string[] = [];

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    // Another demo night a day earlier: its people uncovered the same cells first, so a squad
    // query that leaked outsiders would credit cells to them.
    const before = await db.select({ id: profiles.id }).from(profiles);
    await seedDemo(db, new Date(seededAt.getTime() - 86_400_000));
    const others = await db.select({ id: profiles.id }).from(profiles);
    ({ profileId: maya } = await seedDemo(db, seededAt));
    const known = new Set(before.map((p) => p.id));
    outsiders = others.map((p) => p.id).filter((id) => !known.has(id));
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F12.2] maps everyone in the squad's cells, each credited to a member", async () => {
    const squad = await squadOf(db, maya, seededAt);
    expect(squad.members.map((m) => m.you)).toEqual([true, false, false]);
    expect(squad.members.slice(1).map((m) => m.name)).toEqual(["Priya", "Sam"]);
    const ids = new Set(squad.members.map((m) => m.id));
    expect(squad.cells.length).toBeGreaterThan(0);
    expect(squad.cells.every((c) => ids.has(c.by))).toBe(true);
    expect(new Set(squad.cells.map((c) => c.h3)).size).toBe(squad.cells.length);
    expect(outsiders.length).toBeGreaterThan(0);
    expect(squad.members.some((m) => outsiders.includes(m.id))).toBe(false);
    expect(squad.cells.some((c) => outsiders.includes(c.by))).toBe(false);
  });

  it("[F12.2] shows a mate's cells only from nights you shared, never their home (D-078)", async () => {
    const before = await squadOf(db, maya, seededAt);
    const mate = before.members.find((m) => !m.you);
    if (!mate) throw new Error("expected a mate");
    // Far from the demo night: a home cell, and a ride a week before you ever met.
    await db.insert(revealedCells).values([
      { profileId: mate.id, h3: "892a3066a33ffff", state: "visited", source: "home" },
      {
        profileId: mate.id,
        h3: "892a3066a37ffff",
        state: "visited",
        source: "ride",
        firstAt: new Date(seededAt.getTime() - 7 * 86_400_000),
      },
    ]);
    const after = await squadOf(db, maya, seededAt);
    const shown = new Set(after.cells.map((c) => c.h3));
    expect(shown.has("892a3066a33ffff")).toBe(false);
    expect(shown.has("892a3066a37ffff")).toBe(false);
    const theirs = await db
      .select()
      .from(revealedCells)
      .where(eq(revealedCells.profileId, mate.id));
    expect(theirs.some((c) => c.source === "home")).toBe(true);
    expect(after.cells.filter((c) => c.by === mate.id).length).toBeLessThan(theirs.length);
  });

  it("[F12.3] counts the demo night toward this week's streak", async () => {
    expect((await squadOf(db, maya, seededAt)).streak).toBe(1);
  });

  it("[F12.1] gives someone with no shared night a squad of one", async () => {
    const [alone] = await db
      .insert(profiles)
      .values({
        displayName: "Alex",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "21plus",
        profileCode: "ALEX2345",
        isDemo: true,
      })
      .returning();
    const squad = await squadOf(db, alone.id, seededAt);
    expect(squad.members.map((m) => m.name)).toEqual(["Alex"]);
    expect(squad.streak).toBe(0);
  });
});
