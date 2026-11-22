import { TZDate } from "@date-fns/tz";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { log } from "@/lib/log";
import { zone } from "@/lib/time";
import type { Db } from "@/server/db/client";
import { data } from "@/server/data";
import { planMeetup } from "@/server/meetup";

// The How it works page's numbers (F15.1): live row counts for the four hypertables, without demo
// rows (F16.2); how much the columnstore compressed them; when the recorder last stored a train;
// and how long the fair solver takes on a fixed three-campus plan.

const hypertables = ["vehicle_positions", "checkins", "ride_events", "noise_readings"] as const;
export type Hypertable = (typeof hypertables)[number];

const statsRow = z.object({
  table: z.enum(hypertables),
  rows: z.coerce.number(),
  before: z.coerce.number().nullable(),
  after: z.coerce.number().nullable(),
});
const lastRunRow = z.object({ last: z.coerce.date().nullable() });

export type HowItWorks = {
  rows: Record<Hypertable, number>;
  /** Bytes before over bytes after compression, or null before any chunk is compressed. */
  compressionRatio: number | null;
  lastRecorderRun: Date | null;
  /** Null when the timed plan found no options. */
  solverMs: number | null;
};

// Demo rows are left out where the table has them; vehicle_positions has none.
const counts = sql`
  select 'vehicle_positions' as table, (select count(*) from vehicle_positions) as rows
  union all select 'checkins', (select count(*) from checkins where not is_demo)
  union all select 'ride_events', (select count(*) from ride_events where not is_demo)
  union all select 'noise_readings', (select count(*) from noise_readings where not is_demo)`;

export async function howItWorks(db: Db): Promise<HowItWorks> {
  const [rows, sizes, lastRun] = await Promise.all([
    db.execute(counts),
    db.execute(sql`
      select hypertable_name as table,
        sum(before_compression_total_bytes) as before, sum(after_compression_total_bytes) as after
      from (select 'vehicle_positions' as hypertable_name, * from hypertable_columnstore_stats('vehicle_positions')
        union all select 'checkins', * from hypertable_columnstore_stats('checkins')
        union all select 'ride_events', * from hypertable_columnstore_stats('ride_events')
        union all select 'noise_readings', * from hypertable_columnstore_stats('noise_readings')) s
      group by hypertable_name`),
    db.execute(sql`select max(ts) as last from vehicle_positions`),
  ]);
  const byTable = new Map(
    z
      .array(statsRow.pick({ table: true, rows: true }))
      .parse(rows)
      .map((r) => [r.table, r.rows]),
  );
  const compressed = z
    .array(statsRow.pick({ table: true, before: true, after: true }))
    .parse(sizes);
  const before = compressed.reduce((sum, r) => sum + (r.before ?? 0), 0);
  const after = compressed.reduce((sum, r) => sum + (r.after ?? 0), 0);
  return {
    rows: {
      vehicle_positions: byTable.get("vehicle_positions") ?? 0,
      checkins: byTable.get("checkins") ?? 0,
      ride_events: byTable.get("ride_events") ?? 0,
      noise_readings: byTable.get("noise_readings") ?? 0,
    },
    compressionRatio: after > 0 ? Math.round((before / after) * 10) / 10 : null,
    lastRecorderRun: z.array(lastRunRow).parse(lastRun)[0]?.last ?? null,
    solverMs: timeSolver(new Date()),
  };
}

const cacheMs = 60_000;
let cached: { at: number; value: HowItWorks } | null = null;

/**
 * `howItWorks`, cached for at most 60 s per server instance (F15.2), with when the numbers were
 * read. When the live queries fail, the last numbers come back with their age; with none yet,
 * null, so the page shows an error while its static parts still render.
 */
export async function cachedHowItWorks(
  db: Db,
  now = Date.now(),
): Promise<{ numbers: HowItWorks; readAt: Date; minutesOld: number } | null> {
  if (cached && now - cached.at < cacheMs)
    return {
      numbers: cached.value,
      readAt: new Date(cached.at),
      minutesOld: (now - cached.at) / 60_000,
    };
  try {
    const value = await howItWorks(db);
    cached = { at: now, value };
    return { numbers: value, readAt: new Date(now), minutesOld: 0 };
  } catch (error) {
    log.error("how-it-works: live numbers failed", error);
    return cached
      ? {
          numbers: cached.value,
          readAt: new Date(cached.at),
          minutesOld: (now - cached.at) / 60_000,
        }
      : null;
  }
}

/**
 * 7:00 PM New York time on the next Friday after `now`. A date past the feed uses its day type's
 * representative date (DATA 3.1), so the timed plan always does the full work.
 */
export function nextFridayEvening(now: Date): Date {
  const local = new TZDate(now.getTime(), zone);
  local.setDate(local.getDate() + ((5 - local.getDay() + 7) % 7 || 7));
  local.setHours(19, 0, 0, 0);
  return new Date(local.getTime());
}

const runs = 3;

/**
 * Milliseconds for the fair solver on BU, Harvard and Tufts meeting next Friday at 7 PM: the
 * median of 3 runs after one untimed warm-up, with the data files already loaded. Null when the
 * solver found no options, so the page never shows the time of a run that did nothing.
 */
function timeSolver(now: Date): number | null {
  const files = {
    stations: data.stations(),
    graph: data.graph(),
    timetable: data.timetable(),
    places: data.places(),
  };
  const input = {
    people: [
      { name: "BU", station: "place-bucen" },
      { name: "Harvard", station: "place-harsq" },
      { name: "Tufts", station: "place-mdftf" },
    ],
    startsAt: nextFridayEvening(now).toISOString(),
    categories: ["food" as const],
    budget: null,
    minGrade: null,
    under21: true,
  };
  if (planMeetup(input, files).kind !== "options") {
    log.error("how-it-works: the timed plan found no options", new Error(input.startsAt));
    return null;
  }
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    planMeetup(input, files);
    times.push(performance.now() - started);
  }
  return Math.round(times.sort((a, b) => a - b)[Math.floor(runs / 2)]);
}
