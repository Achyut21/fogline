import type { Timetable } from "@/lib/gtfs/types";

const windowSeconds = 3600;

/**
 * Whether every given station has a train to board in the hour before a moment on a service
 * date, which is when friends ride to a plan that starts then (D-048). A departure at the moment
 * itself is too late to arrive by it.
 */
export function trainsRunning(
  timetable: Timetable,
  serviceDate: string,
  seconds: number,
  stations: readonly string[],
): boolean {
  const running = timetable.dates[serviceDate];
  if (!running) throw new Error(`The timetable doesn't cover ${serviceDate}`);
  const services = new Set(running);
  const waiting = new Set(stations.map((id) => timetable.stations.indexOf(id)));
  for (const trip of timetable.trips) {
    if (!services.has(trip.service)) continue;
    const pattern = timetable.patterns[trip.pattern];
    trip.offsets.forEach((offset, i) => {
      const departs = trip.start + offset;
      const boardable = i < pattern.length - 1 && !trip.noBoard?.includes(i);
      if (boardable && departs >= seconds - windowSeconds && departs < seconds) {
        waiting.delete(pattern[i]);
      }
    });
    if (waiting.size === 0) return true;
  }
  return waiting.size === 0;
}
