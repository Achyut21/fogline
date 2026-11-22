import { haversineM, type LatLon } from "@/lib/geo/distance";

const maxDistanceM = 150;
const maxAccuracyM = 100;
const earlySeconds = 30 * 60;

export type CheckinAttempt = { at: LatLon; accuracyM: number; time: Date };
export type CheckinTarget = { spot: LatLon; startsAt: Date; endedAt: Date | null };

/** Why a check-in wasn't accepted, with the number the UI shows, rounded up so it never shows the limit itself (F6.2). */
export type CheckinResult =
  | { valid: true }
  | { valid: false; reason: "too-far"; distanceM: number }
  | { valid: false; reason: "low-accuracy"; accuracyM: number }
  | { valid: false; reason: "too-early"; opensAt: Date }
  | { valid: false; reason: "plan-ended"; endedAt: Date };

/**
 * DATA 3.9: within 150 m of the spot, accuracy of 100 m or better, and from 30 minutes before the
 * plan's start until it ends. The time is checked first, then accuracy, then distance, so a
 * fuzzy position is reported as fuzzy rather than as far away.
 */
export function checkInValidity(attempt: CheckinAttempt, target: CheckinTarget): CheckinResult {
  const opensAt = new Date(target.startsAt.getTime() - earlySeconds * 1000);
  if (attempt.time < opensAt) return { valid: false, reason: "too-early", opensAt };
  if (target.endedAt && attempt.time > target.endedAt) {
    return { valid: false, reason: "plan-ended", endedAt: target.endedAt };
  }
  if (!(attempt.accuracyM <= maxAccuracyM)) {
    return { valid: false, reason: "low-accuracy", accuracyM: Math.ceil(attempt.accuracyM) };
  }
  const distanceM = haversineM(attempt.at, target.spot);
  if (!(distanceM <= maxDistanceM)) {
    return { valid: false, reason: "too-far", distanceM: Math.ceil(distanceM) };
  }
  return { valid: true };
}
