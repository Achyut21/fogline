import type { Timetable, TimetableTrip } from "@/lib/gtfs/types";

export type LastTrainLeg =
  | {
      kind: "ride";
      trip: string;
      route: string;
      from: string;
      to: string;
      departs: number;
      arrives: number;
    }
  | { kind: "walk"; from: string; to: string; seconds: number };

export type LastTrain =
  | { kind: "train"; departs: number; legs: LastTrainLeg[]; transfers: string[] }
  | { kind: "none" }
  | { kind: "no-train-needed" }
  /** The timetable doesn't cover this service date, so the last train isn't known. */
  | { kind: "no-timetable" };

/** At most two transfers: three rides. */
const rounds = 3;

type Parent =
  | { kind: "ride"; trip: TimetableTrip; board: number; alight: number }
  | { kind: "walk"; to: number; seconds: number };

function canBoard(trip: TimetableTrip, i: number) {
  return i < trip.offsets.length - 1 && !trip.noBoard?.includes(i);
}

function canAlight(trip: TimetableTrip, i: number) {
  return i > 0 && !trip.noAlight?.includes(i);
}

/**
 * The latest departure from `from` that still reaches `home` on the service date's trips, by a
 * backward round-based search (reverse RAPTOR) with at most two transfers (DATA 3.3). Times are
 * seconds since the service-day origin, so trips past 24:00:00 need no special case.
 */
export function lastTrain(
  timetable: Timetable,
  from: string,
  home: string,
  serviceDate: string,
): LastTrain {
  const origin = timetable.stations.indexOf(from);
  const target = timetable.stations.indexOf(home);
  if (origin === -1 || target === -1) throw new Error(`Unknown station: ${from} or ${home}`);
  if (origin === target || timetable.walks.some((w) => w.from === origin && w.to === target)) {
    return { kind: "no-train-needed" };
  }

  const running = timetable.dates[serviceDate];
  if (!running) return { kind: "no-timetable" };
  const services = new Set(running);
  const trips = timetable.trips.filter((t) => services.has(t.service));
  const n = timetable.stations.length;

  let latest = new Array<number>(n).fill(-Infinity);
  latest[target] = Infinity;
  let walked = new Array<boolean>(n).fill(false);
  let parents = new Array<Parent | undefined>(n);
  const history: (Parent | undefined)[][] = [];

  for (let round = 0; round < rounds; round++) {
    const next = [...latest];
    const nextWalked = [...walked];
    const nextParents = [...parents];
    for (const trip of trips) {
      const stations = timetable.patterns[trip.pattern];
      let alight = -1;
      for (let i = stations.length - 1; i >= 0; i--) {
        const station = stations[i];
        const time = trip.start + trip.offsets[i];
        if (alight !== -1 && canBoard(trip, i) && time > next[station]) {
          next[station] = time;
          nextWalked[station] = false;
          nextParents[station] = { kind: "ride", trip, board: i, alight };
        }
        if (canAlight(trip, i)) {
          const transfer =
            station === target || walked[station] ? 0 : timetable.transferSeconds[station];
          if (station === target || time + transfer <= latest[station]) {
            if (alight === -1 || station === target) alight = i;
          }
        }
      }
    }
    for (const walk of timetable.walks) {
      if (walk.to === target) continue;
      const departs = next[walk.to] - walk.seconds;
      if (!nextWalked[walk.to] && departs > next[walk.from]) {
        next[walk.from] = departs;
        nextWalked[walk.from] = true;
        nextParents[walk.from] = { kind: "walk", to: walk.to, seconds: walk.seconds };
      }
    }
    latest = next;
    walked = nextWalked;
    parents = nextParents;
    history.push(parents);
  }

  if (latest[origin] === -Infinity) return { kind: "none" };
  return { kind: "train", departs: latest[origin], ...trace(timetable, history, origin, target) };
}

function trace(
  timetable: Timetable,
  history: (Parent | undefined)[][],
  origin: number,
  target: number,
): { legs: LastTrainLeg[]; transfers: string[] } {
  const name = (i: number) => timetable.stations[i];
  const legs: LastTrainLeg[] = [];
  let station = origin;
  let round = history.length - 1;
  while (station !== target && round >= 0) {
    const parent = history[round][station];
    if (!parent) break;
    if (parent.kind === "walk") {
      legs.push({
        kind: "walk",
        from: name(station),
        to: name(parent.to),
        seconds: parent.seconds,
      });
      station = parent.to;
      continue;
    }
    const stations = timetable.patterns[parent.trip.pattern];
    const to = stations[parent.alight];
    legs.push({
      kind: "ride",
      trip: parent.trip.id,
      route: parent.trip.route,
      from: name(station),
      to: name(to),
      departs: parent.trip.start + parent.trip.offsets[parent.board],
      arrives: parent.trip.start + parent.trip.offsets[parent.alight],
    });
    station = to;
    round -= 1;
  }
  const rides = legs.filter((leg) => leg.kind === "ride");
  return { legs, transfers: rides.slice(0, -1).map((ride) => ride.to) };
}
