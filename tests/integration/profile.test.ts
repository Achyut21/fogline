import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { gridDisk } from "h3-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cellOf } from "@/lib/geo/cells";
import { createDb, type Db } from "@/server/db/client";
import { profiles, revealedCells } from "@/server/db/schema";
import { insertProfile, profileIdByCode } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("profiles", () => {
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

  const home = stationById("place-kencl");

  it("[F2.1] starts a new profile with only the home station's k=1 disk seen", async () => {
    if (!home) throw new Error("Kenmore missing from data/stations.json");
    const { id } = await insertProfile(db, {
      name: "Maya",
      school: "Boston University",
      home,
      ageBand: "under21",
    });
    const cells = await db.select().from(revealedCells).where(eq(revealedCells.profileId, id));
    expect(new Set(cells.map((c) => c.h3))).toEqual(new Set(gridDisk(cellOf(home), 1)));
    expect(new Set(cells.map((c) => `${c.state}/${c.source}`))).toEqual(new Set(["seen/home"]));
  });

  it("[F1.3] finds a profile by its code and nothing by a code no one has", async () => {
    if (!home) throw new Error("Kenmore missing from data/stations.json");
    const { id, profileCode } = await insertProfile(db, {
      name: "Priya",
      school: "Northeastern",
      home,
      ageBand: "21plus",
    });
    expect(await profileIdByCode(db, profileCode)).toBe(id);
    expect(await profileIdByCode(db, "ZZZZZZZZ")).toBeNull();
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(row.profileCode).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
  });
});
