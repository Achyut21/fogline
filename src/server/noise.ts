import { sql } from "drizzle-orm";
import { loudnessOf, type Loudness } from "@/lib/noise";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { stationById } from "@/server/stations";

// Calm mode on the server (F13.2, F13.3, F13.5): which segments exist, and what riders measured on
// them, read from the `segment_noise_hourly` continuous aggregate.

export type Segment = { route: string; from: string; to: string };

/** Whether two stations are next to each other on a route, in that order. */
export function isSegment({ route, from, to }: Segment): boolean {
  return data
    .shapes()
    .some(
      (line) =>
        line.route === route &&
        line.stops.some((s, i) => s.station === from && line.stops[i + 1]?.station === to),
    );
}

/** The next stations from `from` on each route and direction, for the measuring picker. */
export function nextStops(from: string): { route: string; to: string; toName: string }[] {
  const seen = new Set<string>();
  const out: { route: string; to: string; toName: string }[] = [];
  for (const line of data.shapes()) {
    const i = line.stops.findIndex((s) => s.station === from);
    const to = i >= 0 ? line.stops[i + 1]?.station : undefined;
    const key = `${line.route}:${to}`;
    if (!to || seen.has(key)) continue;
    seen.add(key);
    out.push({ route: line.route, to, toName: stationById(to)?.name ?? to });
  }
  return out;
}

const windowDays = 30;

type SegmentRow = { route: string; from: string; to: string; db: number; readings: number };

/** Every measured segment's average level over the last 30 days. */
export async function measuredSegments(db: Db, now = new Date()): Promise<SegmentRow[]> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60_000);
  const rows = await db.execute<{
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    db: number;
    readings: number;
  }>(sql`
    select route_id, from_stop_id, to_stop_id,
           10 * log(avg(power(10, db_avg / 10))) as db,
           sum(readings)::int as readings
    from segment_noise_hourly
    where hour >= ${since.toISOString()}
    group by route_id, from_stop_id, to_stop_id`);
  return rows.map((r) => ({
    route: r.route_id,
    from: r.from_stop_id,
    to: r.to_stop_id,
    db: Number(r.db),
    readings: Number(r.readings),
  }));
}

export type SensoryPreview = {
  /** How loud trains leaving this station are, against every measured segment. */
  sound: { loudness: Loudness; readings: number } | null;
  /** The New York hour with the quietest measured rides from here, when there are any. */
  quietestHour: number | null;
};

/** A station's sensory preview (F13.5) from measured data only; nulls mean no data yet. */
export async function sensoryPreview(
  db: Db,
  station: string,
  now = new Date(),
): Promise<SensoryPreview> {
  const all = await measuredSegments(db, now);
  const here = all.filter((s) => s.from === station || s.to === station);
  if (here.length === 0) return { sound: null, quietestHour: null };
  const readings = here.reduce((n, s) => n + s.readings, 0);
  const energy = here.reduce((sum, s) => sum + 10 ** (s.db / 10) * s.readings, 0) / readings;
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60_000);
  const [quiet] = await db.execute<{ hour: number }>(sql`
    select extract(hour from hour at time zone 'America/New_York')::int as hour
    from segment_noise_hourly
    where hour >= ${since.toISOString()}
      and (from_stop_id = ${station} or to_stop_id = ${station})
    group by 1
    order by 10 * log(avg(power(10, db_avg / 10))) asc
    limit 1`);
  return {
    sound: {
      loudness: loudnessOf(
        10 * Math.log10(energy),
        all.map((s) => s.db),
      ),
      readings,
    },
    quietestHour: quiet ? Number(quiet.hour) : null,
  };
}
