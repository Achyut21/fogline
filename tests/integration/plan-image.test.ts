import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/og/plan/[planId]/route";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import { planParticipants, planStops, plans } from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const session = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const token = "PREVKEW23456";

describe.skipIf(testUrl === "")("invite link preview image", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let planId = "";

  const image = (id: string, t: string | null) =>
    GET(new Request(`http://localhost/api/og/plan/${id}${t ? `?t=${t}` : ""}`), {
      params: Promise.resolve({ planId: id }),
    });

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const home = stationById("place-knncl");
    const spot = data
      .places()
      .find(
        (p) => p.category === "food" && p.ageRule === "all" && p.stations[0]?.id === "place-knncl",
      );
    if (!home || !spot) throw new Error("missing data");
    const { id: maya } = await insertProfile(db, {
      name: "Maya",
      school: "MIT",
      home,
      ageBand: "under21",
    });
    const [row] = await db
      .insert(plans)
      .values({
        createdBy: maya,
        kind: "meetup",
        title: "Friday dinner",
        startsAt: new Date("2026-11-27T19:00:00-05:00"),
        status: "planned",
        inviteToken: token,
      })
      .returning({ id: plans.id });
    planId = row.id;
    await db.insert(planParticipants).values([
      { planId, profileId: maya, rsvp: "yes" },
      { planId, placeholderName: "Priya", originStationId: "place-harsq" },
    ]);
    await db.insert(planStops).values({
      planId,
      seq: 0,
      placeId: spot.id,
      stationId: "place-knncl",
      scheduledAt: new Date("2026-11-27T19:00:00-05:00"),
    });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F4.8] draws a 1200×630 preview for anyone holding the invite link", async () => {
    const response = await image(planId, token);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it("[F4.8] gives nothing without the plan's own token", async () => {
    expect((await image(planId, null)).status).toBe(404);
    expect((await image(planId, "ABCDEFGHJK23")).status).toBe(404);
    expect((await image("not-a-plan", token)).status).toBe(404);
    expect((await image(crypto.randomUUID(), token)).status).toBe(404);
  });
});
