import type { Timetable } from "@/lib/gtfs/types";
import { toServiceTime } from "@/lib/time";

const windowSeconds = 3600;

/**
 * Whether any subway train leaves within an hour of a moment, on that moment's service date.
 * Null when the timetable doesn't cover the date, so callers can't tell.
 */
export function trainsRunning(timetable: Timetable, at: Date): boolean | null {
  const { serviceDate, seconds } = toServiceTime(at);
  const running = timetable.dates[serviceDate];
  if (!running) return null;
  const services = new Set(running);
  return timetable.trips.some(
    (trip) =>
      services.has(trip.service) &&
      trip.offsets.some((offset) => {
        const departs = trip.start + offset;
        return departs >= seconds && departs < seconds + windowSeconds;
      }),
  );
}
