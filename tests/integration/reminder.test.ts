import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import { planParticipants, planStops, plans } from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { reminderFor } from "@/server/reminder";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const friday = new Date("2026-11-27T19:00:00-05:00");
const now = new Date("2026-11-27T12:00:00-05:00");

describe.skipIf(testUrl === "")("Remind me", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let planId = "";
  let sam = "";
  let local = "";
  let outsider = "";

  const person = async (name: string, home: string) => {
    const station = stationById(home);
    if (!station) throw new Error(`no ${home}`);
    const { id } = await insertProfile(db, {
      name,
      school: "MIT",
      home: station,
      ageBand: "under21",
    });
    return id;
  };

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    sam = await person("Sam", "place-mdftf");
    local = await person("Kai", "place-knncl");
    outsider = await person("Alex", "place-harsq");
    const spot = data
      .places()
      .find((p) => p.category === "food" && p.stations[0]?.id === "place-knncl");
    if (!spot) throw new Error("no food at Kendall/MIT");
    const [row] = await db
      .insert(plans)
      .values({
        createdBy: sam,
        kind: "meetup",
        title: "Friday dinner",
        startsAt: friday,
        status: "planned",
        inviteToken: "REMIND234567",
      })
      .returning({ id: plans.id });
    planId = row.id;
    await db.insert(planParticipants).values([
      { planId, profileId: sam, rsvp: "yes" },
      { planId, profileId: local, rsvp: "yes" },
    ]);
    await db.insert(planStops).values({
      planId,
      seq: 0,
      placeId: spot.id,
      stationId: "place-knncl",
      scheduledAt: friday,
    });
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F5.8] gives a participant an event at their leave-by with 20 and 5 minute alarms", async () => {
    const result = await reminderFor(db, planId, sam, now);
    if (result.kind !== "ics") throw new Error(`expected a file, got ${result.kind}`);
    const spot = data
      .places()
      .find((p) => p.category === "food" && p.stations[0]?.id === "place-knncl");
    const home = stationById("place-mdftf");
    if (!spot || !home) throw new Error("missing data");
    const expected = leaveByFor(
      data.timetable(),
      friday,
      [{ station: "place-knncl", at: spot, walkM: spot.stations[0].walkM }],
      { station: home.id, at: home },
    );
    if (expected.kind !== "train") throw new Error("expected a last train to Medford/Tufts");
    const start = expected.leaveBy
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    expect(result.body).toContain(`DTSTART:${start}`);
    expect(result.body).toContain("TRIGGER:-PT20M");
    expect(result.body).toContain("TRIGGER:-PT5M");
    expect(result.body).toContain("SUMMARY:Leave by ");
  });

  it("[F5.8] has no file for someone outside the plan, a home next door or an ended plan", async () => {
    expect(await reminderFor(db, planId, outsider, now)).toEqual({ kind: "not-found" });
    expect(await reminderFor(db, planId, local, now)).toEqual({ kind: "no-train" });
    await db
      .update(plans)
      .set({ status: "ended", endedAt: new Date("2026-11-28T03:00:00Z") })
      .where(eq(plans.id, planId));
    expect(await reminderFor(db, planId, sam, now)).toEqual({ kind: "ended" });
  });
});
