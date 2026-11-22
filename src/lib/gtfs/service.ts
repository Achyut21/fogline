import type { Timetable } from "@/lib/gtfs/types";

const windowSeconds = 3600;

/**
 * Whether any subway train leaves in the hour before a moment on a service date, which is when
 * friends ride to a plan that starts then (D-048).
 */
export function trainsRunning(timetable: Timetable, serviceDate: string, seconds: number): boolean {
  const running = timetable.dates[serviceDate];
  if (!running) throw new Error(`The timetable doesn't cover ${serviceDate}`);
  const services = new Set(running);
  return timetable.trips.some(
    (trip) =>
      services.has(trip.service) &&
      trip.offsets.some((offset) => {
        const departs = trip.start + offset;
        return departs >= seconds - windowSeconds && departs < seconds;
      }),
  );
}
