import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/og/recap/[planId]/route";
import { createDb, type Db } from "@/server/db/client";
import { plans, profiles } from "@/server/db/schema";
import { seedDemo } from "@/server/demo";
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

const image = (planId: string) =>
  GET(new Request(`http://localhost/api/og/recap/${planId}`), {
    params: Promise.resolve({ planId }),
  });

describe.skipIf(testUrl === "")("recap share image", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let maya: Profile;
  let planId = "";

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const { profileId } = await seedDemo(db, new Date("2026-11-22T05:00:00Z"));
    [maya] = await db.select().from(profiles).where(eq(profiles.id, profileId));
    const [plan] = await db.select().from(plans).where(eq(plans.createdBy, profileId));
    planId = plan.id;
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F9.3] draws the recap as a 1080×1350 PNG", async () => {
    session.viewer = maya;
    const response = await image(planId);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1350);
  });

  it("[F9.4] gives no image to someone who wasn't on the plan", async () => {
    session.viewer = { ...maya, id: crypto.randomUUID() };
    expect((await image(planId)).status).toBe(404);
    session.viewer = null;
    expect((await image(planId)).status).toBe(404);
    session.viewer = maya;
    expect((await image("not-a-plan")).status).toBe(404);
  });
});
