import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { unzipSync } from "fflate";

type Row = Record<string, string>;

export type FeedTrip = {
  id: string;
  route: string;
  service: string;
  direction: 0 | 1;
  shape: string;
  pattern: string;
};

export type FeedStopTime = {
  trip: string;
  stop: string;
  sequence: number;
  arrival: string;
  departure: string;
  noPickup: boolean;
  noDropOff: boolean;
};

export type FeedStop = { id: string; name: string; lat: number; lon: number; parent: string };

export type FeedCalendar = {
  service: string;
  days: boolean[];
  start: string;
  end: string;
};

export type FeedPattern = {
  id: string;
  route: string;
  direction: 0 | 1;
  typicality: number;
  trip: string;
};

export type Feed = {
  version: string;
  start: string;
  end: string;
  routes: string[];
  stops: Map<string, FeedStop>;
  trips: FeedTrip[];
  stopTimes: FeedStopTime[];
  calendar: FeedCalendar[];
  calendarDates: { service: string; date: string; added: boolean }[];
  transfers: { from: string; to: string; seconds: number }[];
  patterns: FeedPattern[];
  shapes: Map<string, [number, number][]>;
};

export const feedUrl = "https://cdn.mbta.com/MBTA_GTFS.zip";

const files = [
  "feed_info.txt",
  "routes.txt",
  "stops.txt",
  "trips.txt",
  "stop_times.txt",
  "calendar.txt",
  "calendar_dates.txt",
  "transfers.txt",
  "route_patterns.txt",
  "shapes.txt",
];

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function field(row: Row, name: string): string {
  const value = row[name];
  if (value === undefined) throw new Error(`GTFS column "${name}" is missing`);
  return value;
}

function toRow(record: unknown): Row {
  if (typeof record !== "object" || record === null) throw new Error("GTFS row isn't a record");
  const row: Row = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "string") throw new Error(`GTFS column "${key}" isn't text`);
    row[key] = value;
  }
  return row;
}

/** GTFS dates are YYYYMMDD; the rest of the app uses YYYY-MM-DD. */
export function isoDate(gtfsDate: string): string {
  if (!/^\d{8}$/.test(gtfsDate)) throw new Error(`Not a GTFS date: "${gtfsDate}"`);
  return `${gtfsDate.slice(0, 4)}-${gtfsDate.slice(4, 6)}-${gtfsDate.slice(6, 8)}`;
}

function direction(value: string): 0 | 1 {
  if (value === "0") return 0;
  if (value === "1") return 1;
  throw new Error(`Not a GTFS direction: "${value}"`);
}

async function* rows(data: Uint8Array | undefined, name: string): AsyncGenerator<Row> {
  if (!data) throw new Error(`The feed has no ${name}`);
  const parser = Readable.from([Buffer.from(data)]).pipe(
    parse({ columns: true, bom: true, skip_empty_lines: true }),
  );
  for await (const record of parser) yield toRow(record);
}

async function collect<T>(
  data: Uint8Array | undefined,
  name: string,
  pick: (row: Row) => T | undefined,
): Promise<T[]> {
  const out: T[] = [];
  for await (const row of rows(data, name)) {
    const value = pick(row);
    if (value !== undefined) out.push(value);
  }
  return out;
}

/** Reads the subway (route types 0 and 1) out of an MBTA GTFS zip. */
export async function readFeed(zip: Uint8Array): Promise<Feed> {
  const unzipped = unzipSync(zip, { filter: (file) => files.includes(file.name) });
  const file = (name: string) => unzipped[name];

  const [info] = await collect(file("feed_info.txt"), "feed_info.txt", (r) => r);
  if (!info) throw new Error("feed_info.txt is empty");

  const routes = await collect(file("routes.txt"), "routes.txt", (r) =>
    ["0", "1"].includes(field(r, "route_type")) ? field(r, "route_id") : undefined,
  );
  const subway = new Set(routes);

  const trips = await collect(file("trips.txt"), "trips.txt", (r): FeedTrip | undefined =>
    subway.has(field(r, "route_id"))
      ? {
          id: field(r, "trip_id"),
          route: field(r, "route_id"),
          service: field(r, "service_id"),
          direction: direction(field(r, "direction_id")),
          shape: field(r, "shape_id"),
          pattern: field(r, "route_pattern_id"),
        }
      : undefined,
  );
  const tripIds = new Set(trips.map((t) => t.id));

  const stopTimes = await collect(file("stop_times.txt"), "stop_times.txt", (r) =>
    tripIds.has(field(r, "trip_id"))
      ? {
          trip: field(r, "trip_id"),
          stop: field(r, "stop_id"),
          sequence: Number(field(r, "stop_sequence")),
          arrival: field(r, "arrival_time"),
          departure: field(r, "departure_time"),
          noPickup: field(r, "pickup_type") === "1",
          noDropOff: field(r, "drop_off_type") === "1",
        }
      : undefined,
  );

  const stops = new Map<string, FeedStop>();
  for await (const r of rows(file("stops.txt"), "stops.txt")) {
    stops.set(field(r, "stop_id"), {
      id: field(r, "stop_id"),
      name: field(r, "stop_name"),
      lat: Number(field(r, "stop_lat")),
      lon: Number(field(r, "stop_lon")),
      parent: field(r, "parent_station"),
    });
  }

  const calendar = await collect(file("calendar.txt"), "calendar.txt", (r) => ({
    service: field(r, "service_id"),
    days: weekdays.map((day) => field(r, day) === "1"),
    start: isoDate(field(r, "start_date")),
    end: isoDate(field(r, "end_date")),
  }));

  const calendarDates = await collect(file("calendar_dates.txt"), "calendar_dates.txt", (r) => ({
    service: field(r, "service_id"),
    date: isoDate(field(r, "date")),
    added: field(r, "exception_type") === "1",
  }));

  const transfers = await collect(file("transfers.txt"), "transfers.txt", (r) =>
    field(r, "transfer_type") === "2" && field(r, "min_transfer_time") !== ""
      ? {
          from: field(r, "from_stop_id"),
          to: field(r, "to_stop_id"),
          seconds: Number(field(r, "min_transfer_time")),
        }
      : undefined,
  );

  const patterns = await collect(file("route_patterns.txt"), "route_patterns.txt", (r) =>
    subway.has(field(r, "route_id"))
      ? {
          id: field(r, "route_pattern_id"),
          route: field(r, "route_id"),
          direction: direction(field(r, "direction_id")),
          typicality: Number(field(r, "route_pattern_typicality")),
          trip: field(r, "representative_trip_id"),
        }
      : undefined,
  );

  const tripsById = new Map(trips.map((t) => [t.id, t]));
  const wantedShapes = new Set(
    patterns.flatMap((p) => (p.typicality === 1 ? [tripsById.get(p.trip)?.shape ?? ""] : [])),
  );
  const shapePoints = await collect(file("shapes.txt"), "shapes.txt", (r) =>
    wantedShapes.has(field(r, "shape_id"))
      ? {
          shape: field(r, "shape_id"),
          sequence: Number(field(r, "shape_pt_sequence")),
          lat: Number(field(r, "shape_pt_lat")),
          lon: Number(field(r, "shape_pt_lon")),
        }
      : undefined,
  );
  shapePoints.sort((a, b) => a.sequence - b.sequence);
  const shapes = new Map<string, [number, number][]>();
  for (const { shape, lat, lon } of shapePoints) {
    const list = shapes.get(shape) ?? [];
    list.push([lat, lon]);
    shapes.set(shape, list);
  }

  return {
    version: field(info, "feed_version"),
    start: isoDate(field(info, "feed_start_date")),
    end: isoDate(field(info, "feed_end_date")),
    routes: routes.sort(),
    stops,
    trips,
    stopTimes,
    calendar,
    calendarDates,
    transfers,
    patterns,
    shapes,
  };
}

export async function fetchFeed(): Promise<Feed> {
  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`GTFS download failed: ${response.status} ${response.statusText}`);
  }
  return readFeed(new Uint8Array(await response.arrayBuffer()));
}
