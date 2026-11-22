import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autoEndAt } from "@/lib/plan-end";
import { createDb, type Db } from "@/server/db/client";
import { badgesAwarded, checkins, planParticipants, planStops, plans } from "@/server/db/schema";
import { endDuePlans } from "@/server/end-plans";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const hour = 3_600_000;
const now = new Date("2026-11-21T04:00:00Z");
const ago = (hours: number) => new Date(now.getTime() - hours * hour);

describe("automatic plan end", () => {
  it("[F6.4] ends 2 hours after the last check-in at the last stop, else 4 after its time", () => {
    expect(autoEndAt(ago(5), ago(3))).toEqual(ago(1));
    expect(autoEndAt(ago(5), null)).toEqual(ago(1));
    expect(autoEndAt(ago(1), null)).toEqual(new Date(now.getTime() + 3 * hour));
  });
});

describe.skipIf(testUrl === "")("end-plans cron", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let me = "";
  let sam = "";
  let n = 0;

  async function plan(
    stopsAgo: number[],
    checkinAgo: number | null,
    status: "live" | "planned" = "live",
  ) {
    n += 1;
    const [row] = await db
      .insert(plans)
      .values({
        createdBy: me,
        kind: stopsAgo.length > 1 ? "crawl" : "meetup",
        title: `Night ${n}`,
        startsAt: ago(stopsAgo[0]),
        status,
        inviteToken: `TOKEN${String(n).padStart(7, "2")}`,
      })
      .returning({ id: plans.id });
    await db.insert(planParticipants).values({ planId: row.id, profileId: me, rsvp: "yes" });
    await db.insert(planStops).values(
      stopsAgo.map((h, seq) => ({
        planId: row.id,
        seq,
        placeId: `spot-${seq}`,
        stationId: "place-knncl",
        scheduledAt: ago(h),
      })),
    );
    if (checkinAgo !== null) {
      await db.insert(checkins).values({
        ts: ago(checkinAgo),
        profileId: me,
        planId: row.id,
        placeId: `spot-${stopsAgo.length - 1}`,
        lat: 42.36,
        lon: -71.09,
        accuracyM: 20,
        valid: true,
      });
    }
    return row.id;
  }

  beforeAll(async () => {
    const kendall = stationById("place-knncl");
    if (!kendall) throw new Error("no Kendall/MIT");
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    ({ id: sam } = await insertProfile(db, {
      name: "Sam",
      school: "Tufts",
      home: kendall,
      ageBand: "under21",
    }));
    ({ id: me } = await insertProfile(db, {
      name: "Maya",
      school: "MIT",
      home: kendall,
      ageBand: "under21",
    }));
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F6.4] ends due plans at the rule's time and leaves the rest open", async () => {
    const quiet = await plan([5], null);
    const checkedIn = await plan([6, 3.5], 2.5);
    // Night badges need two people who came (F8.1), so Sam checks in at the last stop too.
    await db.insert(planParticipants).values({ planId: checkedIn, profileId: sam, rsvp: "yes" });
    await db.insert(checkins).values({
      ts: ago(2.7),
      profileId: sam,
      planId: checkedIn,
      placeId: "spot-1",
      lat: 42.36,
      lon: -71.09,
      accuracyM: 20,
      valid: true,
    });
    const stillGoing = await plan([3, 1], 1);
    const early = await plan([1], null, "planned");
    // A check-in at an earlier stop doesn't count for the last stop's rule.
    const earlierStopOnly = await plan([6, 4.5], null);
    await db.insert(checkins).values({
      ts: ago(5.5),
      profileId: me,
      planId: earlierStopOnly,
      placeId: "spot-0",
      lat: 42.36,
      lon: -71.09,
      accuracyM: 20,
      valid: true,
    });

    const ended = await endDuePlans(db, now);
    expect(new Set(ended)).toEqual(new Set([quiet, checkedIn, earlierStopOnly]));
    const rows = await db.select().from(plans);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(quiet)?.endedAt).toEqual(ago(1));
    expect(byId.get(checkedIn)?.endedAt).toEqual(ago(0.5));
    expect(byId.get(earlierStopOnly)?.endedAt).toEqual(ago(0.5));
    expect(byId.get(stillGoing)?.status).toBe("live");
    expect(byId.get(early)?.status).toBe("planned");
    expect(await endDuePlans(db, now)).toEqual([]);
    // The night's badges come with the end (F8.1): the organizer of a night two people came to.
    const awarded = await db
      .select({ badge: badgesAwarded.badgeId })
      .from(badgesAwarded)
      .where(eq(badgesAwarded.planId, checkedIn));
    expect(awarded.map((b) => b.badge)).toContain("planner");
  });

  it("[F6.4] doesn't touch a plan the organizer already ended", async () => {
    const id = await plan([8], null);
    const by = new Date(now.getTime() - 7 * hour);
    await db.update(plans).set({ status: "ended", endedAt: by }).where(eq(plans.id, id));
    await endDuePlans(db, now);
    const [row] = await db.select().from(plans).where(eq(plans.id, id));
    expect(row.endedAt).toEqual(by);
  });
});
