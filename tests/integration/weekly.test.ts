import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Alert } from "@/lib/alerts";
import { z } from "zod";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { storedStopSchema } from "@/lib/weekly";
import { checkIn } from "@/server/actions/live";
import { planByInvite } from "@/server/actions/plans";
import { data } from "@/server/data";
import { stopSpot } from "@/server/stop-spot";
import { createDb, type Db } from "@/server/db/client";
import { planParticipants, planStops, plans, profiles, weeklyPlans } from "@/server/db/schema";
import { copyWeeklyPlan, makeWeeklyPlans, weeklyPlansFor } from "@/server/weekly";
import { createScratchDatabase } from "./scratch-database";

type Profile = typeof profiles.$inferSelect;

const session = vi.hoisted(() => ({
  db: null as unknown,
  viewer: null as Profile | null,
  alerts: [] as Alert[] | null,
}));
vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/profile", async (original) => ({
  ...(await original<typeof import("@/server/profile")>()),
  currentProfile: async () => session.viewer,
}));
vi.mock("@/server/alerts", async (original) => ({
  ...(await original<typeof import("@/server/alerts")>()),
  currentAlerts: async () => session.alerts,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => session.viewer?.id ?? null,
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const monday6am = new Date("2026-11-23T06:00:00-05:00");

// Drafting a week scores every candidate for five campuses: CPU-heavy beside the other suites.
describe.skipIf(testUrl === "")("weekly plans", { timeout: 30_000 }, () => {
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

  it("[F10.4] stores the week's plans once, however often the cron runs", async () => {
    expect(await makeWeeklyPlans(db, monday6am)).toBe(3);
    expect(await makeWeeklyPlans(db, monday6am)).toBe(0);
    expect(await db.select().from(weeklyPlans)).toHaveLength(3);
    const shown = await weeklyPlansFor(db, new Date("2026-11-25T12:00:00-05:00"));
    expect(shown).toHaveLength(3);
    expect(shown[0].title).toMatch(/^(Breakfast|Lunch|Dinner), then /);
    expect(shown[0].stops.at(-1)?.category).toBe("event");
    // An event stop's ID would spell out a puzzle answer's date and title, so it's a hash.
    const eventIds = new Set(data.events().map((e) => e.id));
    expect(shown.flatMap((p) => p.stops).some((stop) => eventIds.has(stop.id))).toBe(false);
    expect(shown[0].stops.at(-1)?.id).toMatch(/^event-[0-9a-f]{12}$/);
    expect(shown.slice(1).map((p) => p.title)).toEqual([
      "Dinner, then dessert",
      "Coffee, then museum or show",
    ]);
    expect(await weeklyPlansFor(db, new Date("2026-12-01T12:00:00-05:00"))).toEqual([]);
  });

  it("[F10.5] copies a weekly plan into the viewer's own crawl once, with its own invite link", async () => {
    const [maya] = await db
      .insert(profiles)
      .values({
        displayName: "Maya",
        school: "MIT",
        homeStationId: "place-knncl",
        ageBand: "under21",
        profileCode: "MAYA2345",
      })
      .returning();
    const [weekly] = await weeklyPlansFor(db, monday6am);
    const first = await copyWeeklyPlan(db, weekly.id, maya, monday6am);
    const second = await copyWeeklyPlan(db, weekly.id, maya, monday6am);
    if (!first || !second) throw new Error("expected copies");
    // A second tap gives back the same copy, even when both taps arrive at once.
    expect(second).toEqual(first);
    const [a, b] = await Promise.all([
      copyWeeklyPlan(db, weekly.id, maya, monday6am),
      copyWeeklyPlan(db, weekly.id, maya, monday6am),
    ]);
    expect(a).toEqual(first);
    expect(b).toEqual(first);
    const copies = await db.select().from(plans).where(eq(plans.createdBy, maya.id));
    expect(copies.filter((c) => c.title === weekly.title)).toHaveLength(1);
    expect(first.inviteToken).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);

    const [plan] = await db.select().from(plans).where(eq(plans.id, first.id));
    expect(plan).toMatchObject({
      kind: "crawl",
      status: "planned",
      createdBy: maya.id,
      isDemo: false,
    });
    expect(plan.title).toBe(weekly.title);
    const seats = await db
      .select()
      .from(planParticipants)
      .where(eq(planParticipants.planId, first.id));
    expect(seats.map((s) => [s.profileId, s.rsvp])).toEqual([[maya.id, "yes"]]);
    const stops = await db.select().from(planStops).where(eq(planStops.planId, first.id));
    expect(stops.map((s) => stopSpot(s.placeId, s.stationId)?.id)).toEqual(
      weekly.stops.map((s) => s.id),
    );
    expect(stops.map((s) => s.walkedFromPrevious)).toEqual(
      weekly.stops.map((s) => s.leg?.mode === "walk"),
    );
    expect(await copyWeeklyPlan(db, crypto.randomUUID(), maya, monday6am)).toBeNull();
  });

  it("[F10.5] copies only this week's plans, and only while every stop is all-ages", async () => {
    const [maya] = await db.select().from(profiles).where(eq(profiles.profileCode, "MAYA2345"));
    const [weekly] = await weeklyPlansFor(db, monday6am);
    const nextWeek = new Date("2026-11-30T12:00:00-05:00");
    expect(await copyWeeklyPlan(db, weekly.id, maya, nextWeek)).toBeNull();

    const bar = data.places().find((p) => p.ageRule === "21plus" && p.stations.length > 0);
    if (!bar) throw new Error("no 21+ spot");
    const [row] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, weekly.id));
    const stops = z.array(storedStopSchema).parse(row.stops);
    const changed = [
      { ...stops[0], placeId: bar.id, stationId: bar.stations[0].id },
      ...stops.slice(1),
    ];
    await db.update(weeklyPlans).set({ stops: changed }).where(eq(weeklyPlans.id, weekly.id));
    expect((await weeklyPlansFor(db, monday6am)).map((p) => p.id)).not.toContain(weekly.id);
    expect(await copyWeeklyPlan(db, weekly.id, maya, monday6am)).toBeNull();
    await db.update(weeklyPlans).set({ stops }).where(eq(weeklyPlans.id, weekly.id));
  });

  it("[F10.3] [F10.6] lists every stop of a copied crawl and times leave-by from the event", async () => {
    const [maya] = await db.select().from(profiles).where(eq(profiles.profileCode, "MAYA2345"));
    session.viewer = maya;
    const [weekly] = await weeklyPlansFor(db, monday6am);
    const copy = await copyWeeklyPlan(db, weekly.id, maya, monday6am);
    if (!copy) throw new Error("expected a copy");
    const page = await planByInvite(copy.inviteToken);
    if (!page) throw new Error("expected the plan");
    expect(page.stops.map((s) => s.id)).toEqual(weekly.stops.map((s) => s.id));
    const event = data.events().find((e) => e.venue === weekly.stops.at(-1)?.name);
    if (!event) throw new Error("expected the event stop");
    expect(page.stops.at(-1)?.name).toBe(event.venue);

    const home = data.stations().find((s) => s.id === maya.homeStationId);
    if (!home) throw new Error("no home station");
    const [first] = weekly.stops;
    const dinner = data.places().find((p) => p.id === first.id);
    if (!dinner) throw new Error("no dinner spot");
    const expected = leaveByFor(
      data.timetable(),
      new Date(weekly.stops[weekly.stops.length - 1].scheduledAt),
      [
        {
          station: first.station.id,
          at: dinner,
          walkM: dinner.stations.find((s) => s.id === first.station.id)?.walkM ?? 0,
        },
        { station: event.station.id, at: event, walkM: event.station.walkM },
      ],
      { station: home.id, at: home },
    );
    expect(page.people.find((p) => p.you)?.leaveBy).toEqual(expected);

    // A check-in at the event stop is judged against the venue, not refused as unknown.
    const result = await checkIn({
      planId: copy.id,
      seq: weekly.stops.length - 1,
      lat: event.lat,
      lon: event.lon,
      accuracyM: 10,
    });
    expect(result).not.toEqual({ valid: false, reason: "not-found" });
  });

  it("[F5.6] tells members about an alert on their way home, and nobody else", async () => {
    const [maya] = await db.select().from(profiles).where(eq(profiles.profileCode, "MAYA2345"));
    const [weekly] = await weeklyPlansFor(db, monday6am);
    const copy = await copyWeeklyPlan(db, weekly.id, maya, monday6am);
    if (!copy) throw new Error("expected a copy");
    session.viewer = maya;
    session.alerts = null;
    const quiet = await planByInvite(copy.inviteToken);
    expect(quiet?.people.find((p) => p.you)?.alerts).toBeNull();

    const before = await planByInvite(copy.inviteToken);
    const leaveBy = before?.people.find((p) => p.you)?.leaveBy;
    if (leaveBy?.kind !== "train") throw new Error("expected a train home");
    const [firstRide] = leaveBy.legs.filter((l) => l.kind === "ride");
    if (firstRide?.kind !== "ride") throw new Error("expected a ride");
    session.alerts = [
      {
        id: "a",
        text: "Shuttle buses replace trains.",
        lines: new Set([firstRide.route]),
        stations: new Map(),
        periods: [{ start: 0, end: null }],
      },
    ];
    const page = await planByInvite(copy.inviteToken);
    expect(page?.people.find((p) => p.you)?.alerts).toEqual({
      kind: "disrupted",
      texts: ["Shuttle buses replace trains."],
    });
    session.viewer = null;
    const outside = await planByInvite(copy.inviteToken);
    expect(outside?.people.every((p) => p.alerts === null)).toBe(true);
    session.alerts = [];
  });
});
