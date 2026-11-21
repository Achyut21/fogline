import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { timescaleVersion } from "@/server/db/health";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("migrations on a fresh database", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("install timescaledb and record each migration once, even when run twice", async () => {
    expect(await timescaleVersion(db)).toBeNull();

    await migrate(db, { migrationsFolder: "drizzle" });
    await migrate(db, { migrationsFolder: "drizzle" });

    expect(await timescaleVersion(db)).toMatch(/^\d+\.\d+\.\d+/);
    const applied = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
    );
    expect(applied[0]?.count).toBe(1);
  });
});
