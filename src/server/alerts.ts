import { z } from "zod";
import { parseAlerts, type Alert } from "@/lib/alerts";
import { log } from "@/lib/log";
import { data } from "@/server/data";

export const alertsUrl = "https://cdn.mbta.com/realtime/Alerts_enhanced.json";

// Alerts change slowly, so one fetch serves every plan page for a minute. When the feed fails, the
// last good copy is used, and a failure is remembered for the same minute (like TripUpdates).
const freshMs = 60_000;
let last: { fetchedAt: number; alerts: Alert[] } | null = null;
let failedAt: number | null = null;
let pending: Promise<Alert[]> | null = null;

class FeedError extends Error {}

let parents: Map<string, string> | null = null;
function parentOf(stop: string): string {
  parents ??= new Map(
    data.stations().flatMap((s) => s.stops.map((child) => [child, s.id] as const)),
  );
  return parents.get(stop) ?? stop;
}

async function fetchAlerts(): Promise<Alert[]> {
  const body = await fetch(alertsUrl, { cache: "no-store", signal: AbortSignal.timeout(4_000) })
    .then((response) => {
      if (!response.ok) throw new FeedError(`Alerts answered ${response.status}`);
      return response.json();
    })
    .catch((error: unknown) => {
      if (error instanceof FeedError) throw error;
      throw new FeedError("Alerts unreachable or cut off", { cause: error });
    });
  return parseAlerts(body, parentOf);
}

const isFeedFailure = (error: unknown) => error instanceof FeedError || error instanceof z.ZodError;

/** The current disruptions, the last good ones when the feed is down, or null if it never answered. */
export async function currentAlerts(now = Date.now()): Promise<Alert[] | null> {
  if (last && now - last.fetchedAt < freshMs) return last.alerts;
  if (failedAt !== null && now - failedAt < freshMs) return last?.alerts ?? null;
  pending ??= fetchAlerts().finally(() => {
    pending = null;
  });
  return pending.then(
    (alerts) => {
      last = { fetchedAt: Date.now(), alerts };
      failedAt = null;
      return alerts;
    },
    (error: unknown) => {
      if (!isFeedFailure(error)) throw error;
      if (failedAt === null || now - failedAt >= freshMs) {
        log.warn("Alerts unavailable", {
          reason: error instanceof Error ? error.message : String(error),
          servingAgeMs: last ? now - last.fetchedAt : null,
        });
      }
      failedAt = Date.now();
      return last?.alerts ?? null;
    },
  );
}

/** Test hook: forget the cached feed, the last failure and any fetch in flight. */
export function resetAlerts() {
  last = null;
  failedAt = null;
  pending = null;
}

let trips: Map<string, { pattern: number }> | null = null;

/** The stations a ride's train stops at strictly between where it's boarded and left (DATA 3.18). */
export function passes(ride: { trip: string; from: string; to: string }): string[] | null {
  const timetable = data.timetable();
  trips ??= new Map(timetable.trips.map((trip) => [trip.id, trip]));
  const trip = trips.get(ride.trip);
  if (!trip) return null;
  const stations = timetable.patterns[trip.pattern].map((i) => timetable.stations[i]);
  const board = stations.indexOf(ride.from);
  const alight = stations.indexOf(ride.to, board + 1);
  return board === -1 || alight === -1 ? null : stations.slice(board + 1, alight);
}
