import { TZDate } from "@date-fns/tz";

export const zone = "America/New_York";

export type DayType = "weekday" | "saturday" | "sunday";
export type HourBucket = number | "late";

const hour = 3600;
const serviceCutoffHour = 3;
const firstBucketHour = 5;

/** Seconds since the service-day origin for a GTFS time such as "25:30:00". */
export function parseGtfsTime(text: string): number {
  const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(text.trim());
  if (!match) throw new Error(`Not a GTFS time: "${text}"`);
  const [, h, m, s] = match;
  return Number(h) * hour + Number(m) * 60 + Number(s);
}

function dateParts(serviceDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const roundTrip = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    if (roundTrip === serviceDate) return [year, month, day];
  }
  throw new Error(`Not a service date: "${serviceDate}"`);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * GTFS counts service-day times from "noon minus 12 hours" on the service date, which is
 * 11 PM or 1 AM local on DST change days rather than midnight.
 */
export function serviceDayOrigin(serviceDate: string): Date {
  const [year, month, day] = dateParts(serviceDate);
  const noon = new TZDate(year, month - 1, day, 12, zone);
  return new Date(noon.getTime() - 12 * hour * 1000);
}

export function serviceTimeToDate(serviceDate: string, seconds: number): Date {
  return new Date(serviceDayOrigin(serviceDate).getTime() + seconds * 1000);
}

/** The service date a moment belongs to: from midnight to before 3 AM it is the previous date. */
export function serviceDateOf(at: Date): string {
  const local = new TZDate(at.getTime(), zone);
  if (local.getHours() < serviceCutoffHour) local.setDate(local.getDate() - 1);
  return isoDate(local.getFullYear(), local.getMonth() + 1, local.getDate());
}

export function toServiceTime(at: Date): { serviceDate: string; seconds: number } {
  const serviceDate = serviceDateOf(at);
  const seconds = Math.floor((at.getTime() - serviceDayOrigin(serviceDate).getTime()) / 1000);
  return { serviceDate, seconds };
}

export function dayTypeOf(serviceDate: string): DayType {
  const [year, month, day] = dateParts(serviceDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 6) return "saturday";
  if (weekday === 0) return "sunday";
  return "weekday";
}

/**
 * Hour buckets run from 5 to 23. From 24:00:00 it is "late", and times before 05:00:00 use the
 * 5 AM bucket. The bucket alone doesn't say whether trains run; the solvers check that.
 */
export function hourBucketOf(seconds: number): HourBucket {
  const h = Math.floor(seconds / hour);
  if (h >= 24) return "late";
  return Math.max(h, firstBucketHour);
}
