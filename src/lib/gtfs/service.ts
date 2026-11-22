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

/**
 * Each station's first and last boardable departure on a service date, in service-day seconds,
 * so a solver can tell whether a ride can start there at a given moment.
 */
export function boardingSpans(
  timetable: Timetable,
  serviceDate: string,
): Map<string, { first: number; last: number }> {
  const running = timetable.dates[serviceDate];
  if (!running) throw new Error(`The timetable doesn't cover ${serviceDate}`);
  const services = new Set(running);
  const spans = new Map<string, { first: number; last: number }>();
  for (const trip of timetable.trips) {
    if (!services.has(trip.service)) continue;
    const pattern = timetable.patterns[trip.pattern];
    trip.offsets.forEach((offset, i) => {
      if (i === pattern.length - 1 || trip.noBoard?.includes(i)) return;
      const departs = trip.start + offset;
      const station = timetable.stations[pattern[i]];
      const span = spans.get(station);
      if (!span) spans.set(station, { first: departs, last: departs });
      else {
        span.first = Math.min(span.first, departs);
        span.last = Math.max(span.last, departs);
      }
    });
  }
  return spans;
}
