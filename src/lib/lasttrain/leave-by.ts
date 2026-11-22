import { walkM, walkMinutes, type LatLon } from "@/lib/geo/distance";
import type { Timetable } from "@/lib/gtfs/types";
import { serviceTimeToDate, toServiceTime } from "@/lib/time";
import { lastTrain, type LastTrainLeg } from "./search";

const bufferSeconds = 5 * 60;

export type PlanStop = { station: string; at: LatLon; walkM: number };
export type Home = { station: string; at: LatLon };

export type LeaveBy =
  | {
      kind: "train";
      /** The last moment to leave the plan's station: its train, or the start of a walk. */
      departs: Date;
      /** The first train's departure (later than `departs` when the trip starts with a walk). */
      firstTrain: Date;
      leaveBy: Date;
      legs: LastTrainLeg[];
      transfers: string[];
      /** The plan starts after this person has to leave (F5.3). */
      startsAfterLeaveBy: boolean;
    }
  | { kind: "no-train-needed" }
  | { kind: "no-timetable" }
  /** No train reaches home that night; the walk home is shown, never as the default (F5.7). */
  | { kind: "no-train"; walkHomeMinutes: number };

/**
 * When one participant must leave the plan's last stop (F5.5) to make their last train home on
 * the plan's service date (F5.1): the latest departure, minus the walk to the station, minus a
 * 5-minute buffer (F5.2).
 */
export function leaveByFor(
  timetable: Timetable,
  planStart: Date,
  stops: PlanStop[],
  home: Home,
): LeaveBy {
  const last = stops.at(-1);
  if (!last) throw new Error("A plan needs at least one stop");
  const { serviceDate, seconds: startSeconds } = toServiceTime(planStart);
  const result = lastTrain(timetable, last.station, home.station, serviceDate);
  if (result.kind === "no-train-needed" || result.kind === "no-timetable") return result;
  if (result.kind === "none") {
    return { kind: "no-train", walkHomeMinutes: Math.round(walkMinutes(walkM(last.at, home.at))) };
  }
  const leaveBySeconds = result.departs - Math.round(walkMinutes(last.walkM) * 60) - bufferSeconds;
  return {
    kind: "train",
    departs: serviceTimeToDate(serviceDate, result.departs),
    firstTrain: serviceTimeToDate(serviceDate, result.firstTrain),
    leaveBy: serviceTimeToDate(serviceDate, leaveBySeconds),
    legs: result.legs,
    transfers: result.transfers,
    startsAfterLeaveBy: startSeconds > leaveBySeconds,
  };
}

/** Seconds until someone has to leave; negative once it has passed. */
export function marginSeconds(leaveBy: Date, now: Date): number {
  return Math.floor((leaveBy.getTime() - now.getTime()) / 1000);
}
