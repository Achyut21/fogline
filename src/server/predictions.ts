import { z } from "zod";
import { log } from "@/lib/log";
import { parseTrips, type Trips } from "@/lib/predictions";

export const tripUpdatesUrl = "https://cdn.mbta.com/realtime/TripUpdates_enhanced.json";

// ARCHITECTURE section 5: one fetch of the feed serves every station for about 5 s, and when the
// feed fails, the last good copy is served with its own age. A failure is remembered for the same
// 5 s, so an outage doesn't make every request wait out the fetch timeout.
const freshMs = 5_000;

let last: { fetchedAt: number; trips: Trips } | null = null;
let failedAt: number | null = null;
let pending: Promise<Trips> | null = null;

class FeedError extends Error {}

async function fetchTrips(): Promise<Trips> {
  const body = await fetch(tripUpdatesUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  })
    .then((response) => {
      if (!response.ok) throw new FeedError(`TripUpdates answered ${response.status}`);
      return response.json();
    })
    .catch((error: unknown) => {
      if (error instanceof FeedError) throw error;
      throw new FeedError("TripUpdates unreachable or cut off", { cause: error });
    });
  return parseTrips(body);
}

const isFeedFailure = (error: unknown) => error instanceof FeedError || error instanceof z.ZodError;

/** The current trips, the last good ones when the feed is down, or null if it never answered. */
export async function currentTrips(now = Date.now()): Promise<Trips | null> {
  if (last && now - last.fetchedAt < freshMs) return last.trips;
  if (failedAt !== null && now - failedAt < freshMs) return last?.trips ?? null;
  pending ??= fetchTrips().finally(() => {
    pending = null;
  });
  return pending.then(
    (trips) => {
      last = { fetchedAt: Date.now(), trips };
      failedAt = null;
      return trips;
    },
    (error: unknown) => {
      if (!isFeedFailure(error)) throw error;
      if (failedAt === null || now - failedAt >= freshMs) {
        log.warn("TripUpdates unavailable", {
          reason: error instanceof Error ? error.message : String(error),
          servingAgeMs: last ? now - last.fetchedAt : null,
        });
      }
      failedAt = Date.now();
      return last?.trips ?? null;
    },
  );
}

/** Test hook: forget the cached feed, the last failure and any fetch in flight. */
export function resetTrips() {
  last = null;
  failedAt = null;
  pending = null;
}
