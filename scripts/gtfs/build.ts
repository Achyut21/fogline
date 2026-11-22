import { haversineM } from "@/lib/geo/distance";
import {
  bucketIndex,
  bucketKeys,
  type Graph,
  type Leg,
  type ShapeLine,
  type Station,
  type Timetable,
  type TimetableTrip,
  type Walk,
} from "@/lib/gtfs/types";
import { dayTypeOf, hourBucketOf, parseGtfsTime, type DayType } from "@/lib/time";
import type { Feed, FeedStopTime } from "./feed";

export const defaultTransferSeconds = 180;
// A train's gap is the time since the one before it (a rider arriving then waits for it). Gaps
// count at most an hour, so a lone late train doesn't imply a wait of several hours.
const maxGapSeconds = 3600;

export type TripStop = {
  station: string;
  stop: string;
  arrival: number;
  departure: number;
  noPickup: boolean;
  noDropOff: boolean;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value);
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function stationOf(feed: Feed, stopId: string): string {
  const stop = feed.stops.get(stopId);
  if (!stop) throw new Error(`stop_times uses an unknown stop "${stopId}"`);
  return stop.parent || stop.id;
}

/** Every date the feed covers, as YYYY-MM-DD. */
export function feedDates(feed: Feed): string[] {
  const dates: string[] = [];
  for (
    let day = new Date(`${feed.start}T00:00:00Z`);
    day <= new Date(`${feed.end}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

/** Services running on a date: calendar.txt by weekday, then calendar_dates.txt exceptions. */
export function activeServices(feed: Feed, date: string): Set<string> {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const active = new Set(
    feed.calendar
      .filter((c) => c.start <= date && date <= c.end && c.days[weekday])
      .map((c) => c.service),
  );
  for (const exception of feed.calendarDates) {
    if (exception.date !== date) continue;
    if (exception.added) active.add(exception.service);
    else active.delete(exception.service);
  }
  return active;
}

/**
 * For each day type, the date in the feed whose set of running subway services is the most
 * common for that day type, so one-off diversions and holidays don't set typical travel times.
 */
export function representativeDates(feed: Feed): Record<DayType, string> {
  const subwayServices = new Set(feed.trips.map((t) => t.service));
  const counts = new Map<string, { date: string; count: number }>();
  for (const date of feedDates(feed)) {
    const services = [...activeServices(feed, date)].filter((s) => subwayServices.has(s)).sort();
    const key = `${dayTypeOf(date)}|${services.join(",")}`;
    const seen = counts.get(key);
    counts.set(key, { date: seen?.date ?? date, count: (seen?.count ?? 0) + 1 });
  }
  const pick = (dayType: DayType) => {
    let best: { date: string; count: number } | undefined;
    for (const [key, value] of counts) {
      if (!key.startsWith(`${dayType}|`)) continue;
      // Dates are counted in order, so on a tie the earlier set keeps its place.
      if (!best || value.count > best.count) best = value;
    }
    if (!best) throw new Error(`The feed has no ${dayType} dates`);
    return best.date;
  };
  return { weekday: pick("weekday"), saturday: pick("saturday"), sunday: pick("sunday") };
}

const tripStopsCache = new WeakMap<Feed, Map<string, TripStop[]>>();

export function tripStops(feed: Feed): Map<string, TripStop[]> {
  const cached = tripStopsCache.get(feed);
  if (cached) return cached;
  const byTrip = new Map<string, FeedStopTime[]>();
  for (const st of feed.stopTimes) {
    const list = byTrip.get(st.trip) ?? [];
    list.push(st);
    byTrip.set(st.trip, list);
  }
  const out = new Map<string, TripStop[]>();
  for (const [trip, list] of byTrip) {
    list.sort((a, b) => a.sequence - b.sequence);
    out.set(
      trip,
      list.map((st) => ({
        station: stationOf(feed, st.stop),
        stop: st.stop,
        arrival: parseGtfsTime(st.arrival),
        departure: parseGtfsTime(st.departure),
        noPickup: st.noPickup,
        noDropOff: st.noDropOff,
      })),
    );
  }
  tripStopsCache.set(feed, out);
  return out;
}

export function buildStations(feed: Feed): Station[] {
  const routesAt = new Map<string, Set<string>>();
  const stopsAt = new Map<string, Set<string>>();
  const routeOf = new Map(feed.trips.map((t) => [t.id, t.route]));
  for (const st of feed.stopTimes) {
    const station = stationOf(feed, st.stop);
    routesAt.set(station, (routesAt.get(station) ?? new Set()).add(routeOf.get(st.trip) ?? ""));
    stopsAt.set(station, (stopsAt.get(station) ?? new Set()).add(st.stop));
  }
  return [...routesAt.keys()].sort().map((id) => {
    const stop = feed.stops.get(id);
    if (!stop) throw new Error(`Station "${id}" is missing from stops.txt`);
    return {
      id,
      name: stop.name,
      lat: round(stop.lat, 6),
      lon: round(stop.lon, 6),
      routes: [...(routesAt.get(id) ?? [])].sort(),
      stops: [...(stopsAt.get(id) ?? [])].sort(),
    };
  });
}

function position(index: Map<string, number>, station: string): number {
  const i = index.get(station);
  if (i === undefined) throw new Error(`Station "${station}" isn't in stations.json`);
  return i;
}

/** Expected wait for a rider arriving at a random moment, given the gaps between departures. */
export function expectedWait(gaps: number[]): number {
  const total = gaps.reduce((sum, gap) => sum + gap, 0);
  if (total === 0) return 0;
  return Math.round(gaps.reduce((sum, gap) => sum + gap * gap, 0) / (2 * total));
}

function buildLegs(
  feed: Feed,
  stops: Map<string, TripStop[]>,
  index: Map<string, number>,
  routeSets: Map<string, number>,
  date: string,
): Leg[] {
  const active = activeServices(feed, date);
  const rides = new Map<string, { departure: number; ride: number; route: string }[]>();
  for (const trip of feed.trips) {
    if (!active.has(trip.service)) continue;
    const seq = stops.get(trip.id) ?? [];
    for (let i = 0; i < seq.length; i++) {
      const board = seq[i];
      if (board.noPickup) continue;
      for (let j = i + 1; j < seq.length; j++) {
        const alight = seq[j];
        if (alight.noDropOff || alight.station === board.station) continue;
        const key = `${board.station}>${alight.station}`;
        const list = rides.get(key) ?? [];
        list.push({
          departure: board.departure,
          ride: alight.arrival - board.departure,
          route: trip.route,
        });
        rides.set(key, list);
      }
    }
  }

  const routeSet = (routes: Set<string>) => {
    const key = [...routes].sort().join(",");
    let i = routeSets.get(key);
    if (i === undefined) {
      i = routeSets.size;
      routeSets.set(key, i);
    }
    return i;
  };

  const legs: Leg[] = [];
  for (const [key, list] of rides) {
    const [from, to] = key.split(">");
    list.sort((a, b) => a.departure - b.departure || a.ride - b.ride);
    const rideBy: number[][] = bucketKeys.map(() => []);
    const gapBy: number[][] = bucketKeys.map(() => []);
    const routesBy: Set<string>[] = bucketKeys.map(() => new Set());
    list.forEach((r, k) => {
      const next = list[k + 1]?.departure;
      const prev = list[k - 1]?.departure;
      const gap = Math.min(
        prev !== undefined
          ? r.departure - prev
          : next !== undefined
            ? next - r.departure
            : maxGapSeconds,
        maxGapSeconds,
      );
      const b = bucketIndex(hourBucketOf(r.departure));
      rideBy[b].push(r.ride);
      gapBy[b].push(gap);
      routesBy[b].add(r.route);
    });
    legs.push({
      from: position(index, from),
      to: position(index, to),
      ride: rideBy.map((values) => (values.length ? median(values) : null)),
      wait: gapBy.map((gaps) => (gaps.length ? expectedWait(gaps) : null)),
      routes: routesBy.map((routes) => (routes.size ? routeSet(routes) : null)),
    });
  }
  return legs.sort((a, b) => a.from - b.from || a.to - b.to);
}

export function buildGraph(feed: Feed, stations: Station[]): Graph {
  const ids = stations.map((s) => s.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const stops = tripStops(feed);
  const dates = representativeDates(feed);
  const routeSets = new Map<string, number>();

  // Only transfers between subway platforms count: parent stations also hold commuter-rail
  // platforms and bus bays, whose transfer times are longer. A walk between stations only counts
  // between platforms with no route in common, since a train already joins the others.
  const subwayStops = new Set(stations.flatMap((s) => s.stops));
  const routeOf = new Map(feed.trips.map((t) => [t.id, t.route]));
  const routesAt = new Map<string, Set<string>>();
  for (const st of feed.stopTimes) {
    routesAt.set(st.stop, (routesAt.get(st.stop) ?? new Set()).add(routeOf.get(st.trip) ?? ""));
  }
  const shareRoute = (a: string, b: string) =>
    [...(routesAt.get(a) ?? [])].some((route) => routesAt.get(b)?.has(route));
  const sameStation = new Map<number, number[]>();
  const walkSeconds = new Map<string, number[]>();
  for (const t of feed.transfers) {
    if (!subwayStops.has(t.from) || !subwayStops.has(t.to)) continue;
    const a = position(index, stationOf(feed, t.from));
    const b = position(index, stationOf(feed, t.to));
    if (a === b) {
      sameStation.set(a, [...(sameStation.get(a) ?? []), t.seconds]);
    } else if (!shareRoute(t.from, t.to)) {
      const key = `${a}>${b}`;
      walkSeconds.set(key, [...(walkSeconds.get(key) ?? []), t.seconds]);
    }
  }
  const walks: Walk[] = [...walkSeconds]
    .map(([key, seconds]) => {
      const [from, to] = key.split(">").map(Number);
      return { from, to, seconds: median(seconds) };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const legs = {
    weekday: buildLegs(feed, stops, index, routeSets, dates.weekday),
    saturday: buildLegs(feed, stops, index, routeSets, dates.saturday),
    sunday: buildLegs(feed, stops, index, routeSets, dates.sunday),
  };

  return {
    feedVersion: feed.version,
    dates,
    stations: ids,
    routeSets: [...routeSets.keys()].map((key) => key.split(",")),
    transferSeconds: ids.map((_, i) => {
      const values = sameStation.get(i);
      return values ? median(values) : defaultTransferSeconds;
    }),
    walks,
    legs,
  };
}

export function buildTimetable(feed: Feed, stations: Station[]): Timetable {
  const ids = stations.map((s) => s.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const stops = tripStops(feed);
  const dates = feedDates(feed);
  const activeByDate = new Map(dates.map((date) => [date, activeServices(feed, date)]));
  const runs = new Set([...activeByDate.values()].flatMap((set) => [...set]));
  const services = [...new Set(feed.trips.map((t) => t.service))].filter((s) => runs.has(s)).sort();
  const serviceIndex = new Map(services.map((s, i) => [s, i]));

  const patterns: number[][] = [];
  const patternIndex = new Map<string, number>();
  const trips: TimetableTrip[] = [];
  for (const trip of [...feed.trips].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const service = serviceIndex.get(trip.service);
    const seq = stops.get(trip.id);
    if (service === undefined || !seq?.length) continue;
    const stationSeq = seq.map((s) => position(index, s.station));
    const key = stationSeq.join(",");
    let pattern = patternIndex.get(key);
    if (pattern === undefined) {
      pattern = patterns.length;
      patterns.push(stationSeq);
      patternIndex.set(key, pattern);
    }
    const start = seq[0].departure;
    const noBoard = seq.flatMap((s, i) => (s.noPickup && i !== seq.length - 1 ? [i] : []));
    const noAlight = seq.flatMap((s, i) => (s.noDropOff && i !== 0 ? [i] : []));
    trips.push({
      id: trip.id,
      route: trip.route,
      direction: trip.direction,
      service,
      pattern,
      start,
      offsets: seq.map((s) => s.departure - start),
      ...(noBoard.length ? { noBoard } : {}),
      ...(noAlight.length ? { noAlight } : {}),
    });
  }

  return {
    feedVersion: feed.version,
    stations: ids,
    services,
    dates: Object.fromEntries(
      dates.map((date) => [
        date,
        [...(activeByDate.get(date) ?? [])]
          .flatMap((s) => {
            const i = serviceIndex.get(s);
            return i === undefined ? [] : [i];
          })
          .sort((a, b) => a - b),
      ]),
    ),
    patterns,
    trips,
  };
}

type Projected = { x: number; y: number };

function planar(lat: number, lon: number, lat0: number): Projected {
  const r = (Math.PI / 180) * 6_371_008.8;
  return { x: lon * r * Math.cos((lat0 * Math.PI) / 180), y: lat * r };
}

/** Distance along a polyline to the point nearest `target`, searching from segment `from` on. */
function along(
  points: [number, number][],
  cumulative: number[],
  target: { lat: number; lon: number },
  from: number,
): { meters: number; segment: number } {
  const p = planar(target.lat, target.lon, target.lat);
  let best = { distance: Infinity, meters: 0, segment: from };
  for (let i = Math.max(from, 0); i < points.length - 1; i++) {
    const a = planar(points[i][0], points[i][1], target.lat);
    const b = planar(points[i + 1][0], points[i + 1][1], target.lat);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t =
      length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    const distance = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (distance < best.distance) {
      best = {
        distance,
        meters: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
        segment: i,
      };
    }
  }
  return { meters: best.meters, segment: best.segment };
}

export function buildShapes(feed: Feed): ShapeLine[] {
  const stops = tripStops(feed);
  const tripsById = new Map(feed.trips.map((t) => [t.id, t]));
  const lines: ShapeLine[] = [];
  for (const pattern of feed.patterns) {
    if (pattern.typicality !== 1) continue;
    const trip = tripsById.get(pattern.trip);
    const points = trip ? feed.shapes.get(trip.shape) : undefined;
    const seq = trip ? stops.get(trip.id) : undefined;
    if (!points?.length || !seq?.length) {
      throw new Error(`Canonical pattern "${pattern.id}" has no shape or stops`);
    }
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const [lat1, lon1] = points[i - 1];
      const [lat2, lon2] = points[i];
      cumulative.push(
        cumulative[i - 1] + haversineM({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }),
      );
    }
    let segment = 0;
    const stationMeters = seq.map((s) => {
      const stop = feed.stops.get(s.stop);
      if (!stop) throw new Error(`Unknown stop "${s.stop}"`);
      const found = along(points, cumulative, stop, segment);
      segment = found.segment;
      return { station: s.station, meters: Math.round(found.meters) };
    });
    lines.push({
      pattern: pattern.id,
      route: pattern.route,
      direction: pattern.direction,
      points: points.map(([lat, lon]) => [round(lat, 5), round(lon, 5)]),
      stops: stationMeters,
    });
  }
  return lines.sort((a, b) => (a.pattern < b.pattern ? -1 : 1));
}
