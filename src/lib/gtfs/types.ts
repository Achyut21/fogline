import { z } from "zod";
import type { HourBucket } from "@/lib/time";

// Each data file's shape is written once as a schema; the types come from it, and loaders
// validate the JSON against it, so `data/*.json` never needs a cast.

/** The hour buckets that `Leg.ride`, `wait` and `routes` are indexed by: 5 to 23, then "late". */
export const bucketKeys = [
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  "late",
] as const;

/** Position of a bucket in `bucketKeys`. Use `hourBucketOf` for times before 5 AM (D-048). */
export function bucketIndex(bucket: HourBucket): number {
  if (bucket === "late") return bucketKeys.length - 1;
  if (!Number.isInteger(bucket) || bucket < 5 || bucket > 23) {
    throw new Error(`Not an hour bucket: ${bucket}`);
  }
  return bucket - 5;
}

const index = z.number().int().nonnegative();
const seconds = z.number().int().nonnegative();
const meters = z.number().int().nonnegative();
const perBucket = <T extends z.ZodType>(value: T) =>
  z.array(value.nullable()).length(bucketKeys.length);

/** A parent station served by the subway. */
export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  routes: z.array(z.string()),
  stops: z.array(z.string()),
});
export type Station = z.infer<typeof stationSchema>;

/**
 * A ride on one train from `from` to `to`. Per bucket `b`: `ride[b]` is the median scheduled ride
 * and `wait[b]` the expected wait for someone arriving at a random moment (sum of squared gaps
 * between departures over twice their sum), both in seconds, and `routes[b]` indexes
 * `Graph.routeSets` with the routes that ran it. Null means no train makes this ride then.
 */
export const legSchema = z.object({
  from: index,
  to: index,
  ride: perBucket(seconds),
  wait: perBucket(seconds),
  routes: perBucket(index),
});
export type Leg = z.infer<typeof legSchema>;

export const walkSchema = z.object({ from: index, to: index, seconds });
export type Walk = z.infer<typeof walkSchema>;

const byDayType = <T extends z.ZodType>(value: T) =>
  z.object({ weekday: value, saturday: value, sunday: value });

export const graphSchema = z.object({
  feedVersion: z.string(),
  dates: byDayType(z.iso.date()),
  stations: z.array(z.string()),
  routeSets: z.array(z.array(z.string())),
  transferSeconds: z.array(seconds),
  walks: z.array(walkSchema),
  legs: byDayType(z.array(legSchema)),
});
export type Graph = z.infer<typeof graphSchema>;

/**
 * Departure times in seconds since the service-day origin. `noBoard` and `noAlight` list stop
 * positions beyond the defaults: nobody alights at the first stop or boards at the last.
 */
export const timetableTripSchema = z.object({
  id: z.string(),
  route: z.string(),
  direction: z.union([z.literal(0), z.literal(1)]),
  service: index,
  pattern: index,
  start: seconds,
  offsets: z.array(seconds),
  noBoard: z.array(index).optional(),
  noAlight: z.array(index).optional(),
});
export type TimetableTrip = z.infer<typeof timetableTripSchema>;

export const timetableSchema = z.object({
  feedVersion: z.string(),
  stations: z.array(z.string()),
  services: z.array(z.string()),
  dates: z.record(z.iso.date(), z.array(index)),
  patterns: z.array(z.array(index)),
  trips: z.array(timetableTripSchema),
});
export type Timetable = z.infer<typeof timetableSchema>;

/** A canonical route pattern's path, with each station's distance along it. */
export const shapeLineSchema = z.object({
  pattern: z.string(),
  route: z.string(),
  direction: z.union([z.literal(0), z.literal(1)]),
  points: z.array(z.tuple([z.number(), z.number()])),
  stops: z.array(z.object({ station: z.string(), meters })),
});
export type ShapeLine = z.infer<typeof shapeLineSchema>;
