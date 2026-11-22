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

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    ({ profileId: maya } = await seedDemo(db, seededAt));
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
    const all = await db.selectDistinct({ h3: revealedCells.h3 }).from(revealedCells);
    expect(squad.cells.length).toBeLessThanOrEqual(all.length);
    expect(new Set(squad.cells.map((c) => c.h3)).size).toBe(squad.cells.length);
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
