// When a plan ends by itself (F6.4): 2 hours after the last valid check-in at its last stop, or
// 4 hours after the last stop's scheduled time when nobody checked in there. The organizer can
// end it sooner with End.

const hour = 3_600_000;

export function autoEndAt(lastStopAt: Date, lastCheckinAtLastStop: Date | null): Date {
  return lastCheckinAtLastStop
    ? new Date(lastCheckinAtLastStop.getTime() + 2 * hour)
    : new Date(lastStopAt.getTime() + 4 * hour);
}
