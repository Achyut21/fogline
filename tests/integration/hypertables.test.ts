import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import {
  checkins,
  noiseReadings,
  plans,
  profiles,
  rideEvents,
  vehiclePositions,
} from "@/server/db/schema";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const violates = (constraint: string) => ({ cause: { constraint_name: constraint } });

describe.skipIf(testUrl === "")("hypertables", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;
  let codes = 0;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await migrate(db, { migrationsFolder: "drizzle" });
    // Each policy's first run is one interval away; pausing keeps background work out of the
    // reads and refreshes below.
    await db.execute(
      sql`select alter_job(job_id, scheduled => false) from timescaledb_information.jobs
          where job_id >= 1000`,
    );
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  async function newProfile(name: string) {
    codes += 1;
    const [row] = await db
      .insert(profiles)
      .values({
        displayName: name,
        school: "BU",
        homeStationId: "place-bucen",
        ageBand: "21plus",
        profileCode: `HYPR${String(codes).padStart(4, "0")}`,
      })
      .returning();
    if (!row) throw new Error("profile insert returned nothing");
    return row.id;
  }

  async function newPlan(createdBy: string) {
    const [row] = await db
      .insert(plans)
      .values({
        createdBy,
        kind: "meetup",
        title: "Night out",
        startsAt: new Date("2026-11-20T23:00:00Z"),
        inviteToken: crypto.randomUUID(),
      })
      .returning();
    if (!row) throw new Error("plan insert returned nothing");
    return row.id;
  }

  const checkin = (profileId: string, planId: string, iso: string, extra = {}) => ({
    ts: new Date(iso),
    profileId,
    planId,
    placeId: "osm:node/1",
    lat: 42.35,
    lon: -71.06,
    accuracyM: 20,
    valid: true,
    ...extra,
  });

  it("[F15.1] makes the four time-series tables hypertables", async () => {
    const rows = await db.execute<{ name: string }>(
      sql`select hypertable_name as name from timescaledb_information.hypertables order by 1`,
    );
    expect(rows.map((r) => r.name)).toEqual([
      "checkins",
      "noise_readings",
      "ride_events",
      "vehicle_positions",
    ]);
  });

  it("[F15.1] compresses each table on its schedule and segments it for its lookups", async () => {
    const jobs = await db.execute<{ proc: string; table: string; after: string }>(
      sql`select proc_name as proc, hypertable_name as "table",
                 coalesce(config->>'compress_after', config->>'drop_after') as after
          from timescaledb_information.jobs
          where proc_name in ('policy_compression', 'policy_retention')
          order by 1, 2`,
    );
    expect(jobs.map((j) => [j.proc, j.table, j.after])).toEqual([
      ["policy_compression", "checkins", "7 days"],
      ["policy_compression", "noise_readings", "7 days"],
      ["policy_compression", "ride_events", "7 days"],
      ["policy_compression", "vehicle_positions", "1 day"],
      ["policy_retention", "vehicle_positions", "30 days"],
    ]);
    const settings = await db.execute<{ table: string; segmentby: string; orderby: string }>(
      sql`select hypertable::text as "table", segmentby, orderby
          from timescaledb_information.hypertable_columnstore_settings
          where hypertable::text not like '%timescaledb_internal%' order by 1`,
    );
    expect(settings.map((s) => [s.table, s.segmentby, s.orderby])).toEqual([
      ["checkins", "", "ts DESC"],
      ["noise_readings", "route_id", "ts DESC"],
      ["ride_events", "profile_id", "ts DESC"],
      ["vehicle_positions", "route_id", "ts DESC"],
    ]);
  });

  it("[F15.1] refreshes each continuous aggregate over a window of days", async () => {
    const views = await db.execute<{ view: string; start: string; every: string }>(
      sql`select v.view_name as view, j.config->>'start_offset' as start,
                 j.schedule_interval::text as every
          from timescaledb_information.continuous_aggregates v
          join timescaledb_information.jobs j
            on j.hypertable_name = v.view_name
           and j.proc_name = 'policy_refresh_continuous_aggregate'
          order by 1`,
    );
    expect(views.map((v) => [v.view, v.start, v.every])).toEqual([
      ["checkins_daily", "7 days", "01:00:00"],
      ["segment_noise_hourly", "7 days", "01:00:00"],
      ["vehicle_activity_5m", "2 days", "00:05:00"],
    ]);
  });

  it("[F16.2] counts check-ins per New York day without demo rows, across the clocks falling back", async () => {
    const maya = await newProfile("Maya");
    const priya = await newProfile("Priya");
    const plan = await newPlan(maya);
    await db
      .insert(checkins)
      .values([
        checkin(maya, plan, "2026-11-21T04:30:00Z"),
        checkin(priya, plan, "2026-11-21T04:40:00Z", { valid: false }),
        checkin(maya, plan, "2026-11-21T05:30:00Z"),
        checkin(priya, plan, "2026-11-21T04:45:00Z", { isDemo: true }),
        checkin(maya, plan, "2026-11-01T04:30:00Z"),
        checkin(maya, plan, "2026-11-02T04:30:00Z"),
        checkin(priya, plan, "2026-11-02T05:30:00Z"),
      ]);
    const days = await db.execute<{ day: string; checkins: number; valid: number }>(
      sql`select to_char(day at time zone 'America/New_York', 'YYYY-MM-DD') as day,
                 checkins::int, valid_checkins::int as valid
          from checkins_daily where day >= '2026-11-01' and day < '2026-11-23' order by 1`,
    );
    expect(days.map((d) => [d.day, d.checkins, d.valid])).toEqual([
      ["2026-11-01", 2, 2],
      ["2026-11-02", 1, 1],
      ["2026-11-20", 2, 1],
      ["2026-11-21", 1, 1],
    ]);
  });

  it("[F15.2] materializes check-in days through a refresh", async () => {
    const maya = await newProfile("Maya");
    const plan = await newPlan(maya);
    await db
      .insert(checkins)
      .values([
        checkin(maya, plan, "2026-12-10T23:30:00Z"),
        checkin(maya, plan, "2026-12-11T04:30:00Z"),
        checkin(maya, plan, "2026-12-11T15:00:00Z"),
      ]);
    await db.execute(
      sql`call refresh_continuous_aggregate('checkins_daily', '2026-12-09', '2026-12-13')`,
    );
    await db.execute(
      sql`alter materialized view checkins_daily set (timescaledb.materialized_only = true)`,
    );
    const days = await db.execute<{ day: string; checkins: number }>(
      sql`select to_char(day at time zone 'America/New_York', 'YYYY-MM-DD') as day, checkins::int
          from checkins_daily where day >= '2026-12-09' and day < '2026-12-13' order by 1`,
    );
    await db.execute(
      sql`alter materialized view checkins_daily set (timescaledb.materialized_only = false)`,
    );
    expect(days.map((d) => [d.day, d.checkins])).toEqual([
      ["2026-12-10", 2],
      ["2026-12-11", 1],
    ]);
  });

  it("[F15.1] counts distinct vehicles per route every 5 minutes and stores each sample once", async () => {
    const at = (iso: string, vehicleId: string, routeId: string) => ({
      ts: new Date(iso),
      vehicleId,
      routeId,
      lat: 42.36,
      lon: -71.06,
    });
    await db
      .insert(vehiclePositions)
      .values([
        at("2026-11-20T23:00:10Z", "R-1", "Red"),
        at("2026-11-20T23:01:10Z", "R-1", "Red"),
        at("2026-11-20T23:02:10Z", "R-2", "Red"),
        at("2026-11-20T23:06:10Z", "R-1", "Red"),
        at("2026-11-20T23:00:20Z", "G-1", "Green-E"),
      ]);
    await expect(
      db.insert(vehiclePositions).values(at("2026-11-20T23:00:10Z", "R-1", "Red")),
    ).rejects.toMatchObject({
      cause: {
        code: "23505",
        constraint_name: expect.stringMatching(/vehicle_positions_vehicle_ts$/),
      },
    });
    const rows = await db.execute<{ bucket: string; route: string; vehicles: number }>(
      sql`select to_char(bucket at time zone 'UTC', 'HH24:MI') as bucket, route_id as route,
                 vehicles::int from vehicle_activity_5m order by 1, 2`,
    );
    expect(rows.map((r) => [r.bucket, r.route, r.vehicles])).toEqual([
      ["23:00", "Green-E", 1],
      ["23:00", "Red", 2],
      ["23:05", "Red", 1],
    ]);
  });

  it("[F13.2] averages and peaks noise per segment per hour, without demo readings", async () => {
    const leo = await newProfile("Leo");
    const segment = (from: string, to: string) => ({
      profileId: leo,
      routeId: "Red",
      fromStopId: from,
      toStopId: to,
    });
    await db.insert(noiseReadings).values([
      { ...segment("70075", "70077"), ts: new Date("2026-11-20T23:10:00Z"), dbAvg: 70, dbPeak: 85 },
      { ...segment("70075", "70077"), ts: new Date("2026-11-20T23:40:00Z"), dbAvg: 80, dbPeak: 95 },
      { ...segment("70075", "70077"), ts: new Date("2026-11-21T00:10:00Z"), dbAvg: 60, dbPeak: 70 },
      { ...segment("70077", "70079"), ts: new Date("2026-11-20T23:20:00Z"), dbAvg: 90, dbPeak: 99 },
      {
        ...segment("70075", "70077"),
        ts: new Date("2026-11-20T23:30:00Z"),
        dbAvg: 120,
        dbPeak: 130,
        isDemo: true,
      },
    ]);
    const rows = await db.execute<{
      hour: string;
      from: string;
      to: string;
      avg: number;
      peak: number;
      readings: number;
    }>(
      sql`select to_char(hour at time zone 'UTC', 'HH24:MI') as hour, from_stop_id as from,
                 to_stop_id as to, db_avg::float as avg, db_peak::float as peak, readings::int
          from segment_noise_hourly order by 1, 2`,
    );
    expect(rows.map((r) => [r.hour, r.from, r.to, r.avg, r.peak, r.readings])).toEqual([
      ["00:00", "70075", "70077", 60, 70, 1],
      ["23:00", "70075", "70077", 75, 95, 2],
      ["23:00", "70077", "70079", 90, 99, 1],
    ]);
  });

  it("[F3.8] accepts board, pass and alight events, plus on-train taps, and nothing else", async () => {
    const sam = await newProfile("Sam");
    const event = { ts: new Date("2026-11-20T23:00:00Z"), profileId: sam, routeId: "Red" };
    await db.insert(rideEvents).values([
      { ...event, event: "board" },
      { ...event, event: "pass" },
      { ...event, event: "alight" },
      { ...event, event: "on_train" },
    ]);
    await expect(
      db.execute(sql`insert into ride_events (ts, profile_id, route_id, event)
                     values (now(), ${sam}, 'Red', 'transfer')`),
    ).rejects.toMatchObject(violates("ride_events_event"));
  });

  it("refuses rows for a profile that doesn't exist", async () => {
    await expect(
      db.insert(rideEvents).values({
        ts: new Date(),
        profileId: crypto.randomUUID(),
        routeId: "Red",
        event: "board",
      }),
    ).rejects.toMatchObject(violates("ride_events_profile_id_profiles_id_fk"));
  });

  it("deletes a profile's rows from compressed chunks and keeps everyone else's", async () => {
    const gone = await newProfile("Gone");
    const stays = await newProfile("Stays");
    const plan = await newPlan(stays);
    const old = "2026-10-01T23:00:00Z";
    await db
      .insert(checkins)
      .values([checkin(gone, plan, old), checkin(stays, plan, "2026-10-01T23:05:00Z")]);
    const ride = { ts: new Date(old), routeId: "Red", planId: plan };
    await db.insert(rideEvents).values([
      { ...ride, profileId: gone, event: "board" },
      { ...ride, profileId: stays, event: "board" },
    ]);
    await db.insert(noiseReadings).values({
      ts: new Date(old),
      profileId: gone,
      routeId: "Red",
      fromStopId: "70075",
      toStopId: "70077",
      dbAvg: 70,
      dbPeak: 80,
    });
    for (const table of ["checkins", "ride_events", "noise_readings"]) {
      await db.execute(
        sql.raw(
          `select compress_chunk(c) from show_chunks('${table}', older_than => interval '30 days') c`,
        ),
      );
    }
    const [compressed] = await db.execute<{ n: number }>(
      sql`select count(distinct hypertable_name)::int as n from timescaledb_information.chunks
          where is_compressed`,
    );
    expect(compressed?.n).toBe(3);

    await db.delete(profiles).where(eq(profiles.id, gone));

    const before = sql`ts < '2026-11-01'`;
    const checkinOwners = await db.select({ id: checkins.profileId }).from(checkins).where(before);
    const rideOwners = await db.select({ id: rideEvents.profileId }).from(rideEvents).where(before);
    const noiseOwners = await db
      .select({ id: noiseReadings.profileId })
      .from(noiseReadings)
      .where(before);
    expect(checkinOwners).toEqual([{ id: stays }]);
    expect(rideOwners).toEqual([{ id: stays }]);
    expect(noiseOwners).toEqual([]);
  });

  it("drops a deleted plan's check-ins and keeps its ride events without the plan, compressed or not", async () => {
    const rider = await newProfile("Rider");
    const plan = await newPlan(rider);
    await db.insert(checkins).values(checkin(rider, plan, "2026-09-10T23:30:00Z"));
    await db.insert(rideEvents).values({
      ts: new Date("2026-09-10T23:10:00Z"),
      profileId: rider,
      planId: plan,
      routeId: "Red",
      event: "on_train",
    });

    for (const table of ["checkins", "ride_events"]) {
      await db.execute(
        sql.raw(
          `select compress_chunk(c, if_not_compressed => true)
           from show_chunks('${table}', older_than => interval '30 days') c`,
        ),
      );
    }

    await db.delete(plans).where(eq(plans.id, plan));

    expect(await db.select().from(checkins).where(eq(checkins.planId, plan))).toEqual([]);
    const events = await db
      .select({ planId: rideEvents.planId })
      .from(rideEvents)
      .where(eq(rideEvents.profileId, rider));
    expect(events).toEqual([{ planId: null }]);
  });
});
