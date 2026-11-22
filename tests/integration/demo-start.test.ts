import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startDemo } from "@/server/actions/demo";
import { createDb, type Db } from "@/server/db/client";
import { createScratchDatabase } from "./scratch-database";

const session = vi.hoisted(() => ({ db: null as unknown, started: [] as string[] }));

vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => null,
  startSession: async (id: string) => {
    session.started.push(id);
  },
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirected");
  },
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";

describe.skipIf(testUrl === "")("starting a demo", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F16.2] stops seeding copies past the hourly cap", async () => {
    await db.execute(sql`
      insert into profiles (display_name, school, home_station_id, age_band, profile_code, is_demo)
      select 'Demo', 'Boston University', 'place-bucen', 'under21', 'Z' || lpad(g::text, 7, '0'), true
      from generate_series(1, 600) g`);
    expect(await startDemo()).toEqual({ error: "busy" });
    expect(session.started).toEqual([]);
  });
});
