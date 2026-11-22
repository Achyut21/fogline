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
  | {
      kind: "train";
      /** The last moment to leave the plan's station: the first train, or the start of a walk. */
      departs: number;
      /** The first train's departure, which is later than `departs` when the trip starts with a walk. */
      firstTrain: number;
      legs: LastTrainLeg[];
      transfers: string[];
    }
  | { kind: "none" }
  | { kind: "no-train-needed" }
  /** The timetable doesn't cover this service date, so the last train isn't known. */
  | { kind: "no-timetable" };

/** At most two transfers: three rides. */
const rounds = 3;

type BoardParent = { trip: TimetableTrip; board: number; alight: number; round: number };
type ArriveParent =
  | { kind: "home" }
  | { kind: "walk-home"; seconds: number }
  | { kind: "board" }
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
 *
 * Each round keeps two labels per station: the latest train to board there, and the latest
 * arrival by train there (the board time minus the station's transfer time, a walk on to another
 * station's board time, or any time when home is there or a walk away).
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
  const walksFrom = (station: number) => timetable.walks.filter((w) => w.from === station);
  if (origin === target || walksFrom(origin).some((w) => w.to === target)) {
    return { kind: "no-train-needed" };
  }
  const running = timetable.dates[serviceDate];
  if (!running) return { kind: "no-timetable" };
  const services = new Set(running);
  const trips = timetable.trips.filter((t) => services.has(t.service));
  const n = timetable.stations.length;

  const initialArrive = new Array<number>(n).fill(-Infinity);
  const initialArriveParent = new Array<ArriveParent | undefined>(n);
  initialArrive[target] = Infinity;
  initialArriveParent[target] = { kind: "home" };
  for (const walk of timetable.walks) {
    if (walk.to === target) {
      initialArrive[walk.from] = Infinity;
      initialArriveParent[walk.from] = { kind: "walk-home", seconds: walk.seconds };
    }
  }

  // Index r holds the labels after r rounds (r rides at most).
  const board: number[][] = [new Array<number>(n).fill(-Infinity)];
  const boardParent: (BoardParent | undefined)[][] = [new Array(n)];
  const arrive: number[][] = [initialArrive];
  const arriveParent: (ArriveParent | undefined)[][] = [initialArriveParent];

  for (let round = 1; round <= rounds; round++) {
    const deadline = arrive[round - 1];
    const nextBoard = [...board[round - 1]];
    const nextBoardParent = [...boardParent[round - 1]];
    for (const trip of trips) {
      const stations = timetable.patterns[trip.pattern];
      let alight = -1;
      for (let i = stations.length - 1; i >= 0; i--) {
        const time = trip.start + trip.offsets[i];
        if (alight !== -1 && canBoard(trip, i) && time > nextBoard[stations[i]]) {
          nextBoard[stations[i]] = time;
          nextBoardParent[stations[i]] = { trip, board: i, alight, round };
        }
        // Stay on to home (or a walk from it) rather than change trains on the way.
        const settled = alight !== -1 && deadline[stations[alight]] === Infinity;
        if (canAlight(trip, i) && time <= deadline[stations[i]] && !settled) alight = i;
      }
    }

    const nextArrive = [...initialArrive];
    const nextArriveParent = [...initialArriveParent];
    for (let s = 0; s < n; s++) {
      const byBoarding = nextBoard[s] - timetable.transferSeconds[s];
      if (byBoarding > nextArrive[s]) {
        nextArrive[s] = byBoarding;
        nextArriveParent[s] = { kind: "board" };
      }
      for (const walk of walksFrom(s)) {
        const byWalking = nextBoard[walk.to] - walk.seconds;
        if (byWalking > nextArrive[s]) {
          nextArrive[s] = byWalking;
          nextArriveParent[s] = { kind: "walk", to: walk.to, seconds: walk.seconds };
        }
      }
    }
    board.push(nextBoard);
    boardParent.push(nextBoardParent);
    arrive.push(nextArrive);
    arriveParent.push(nextArriveParent);
  }

  // From the plan's station a rider boards here or walks to a nearby station first.
  let departs = board[rounds][origin];
  let startWalk: { to: number; seconds: number } | undefined;
  for (const walk of walksFrom(origin)) {
    if (board[rounds][walk.to] - walk.seconds > departs) {
      departs = board[rounds][walk.to] - walk.seconds;
      startWalk = walk;
    }
  }
  if (departs === -Infinity) return { kind: "none" };

  const name = (i: number) => timetable.stations[i];
  const legs: LastTrainLeg[] = [];
  if (startWalk) {
    legs.push({ kind: "walk", from: from, to: name(startWalk.to), seconds: startWalk.seconds });
  }
  let station = startWalk ? startWalk.to : origin;
  let round = rounds;
  for (;;) {
    const ride = boardParent[round][station];
    if (!ride) throw new Error(`Broken last-train trace at ${name(station)} in round ${round}`);
    const stations = timetable.patterns[ride.trip.pattern];
    const to = stations[ride.alight];
    legs.push({
      kind: "ride",
      trip: ride.trip.id,
      route: ride.trip.route,
      from: name(station),
      to: name(to),
      departs: ride.trip.start + ride.trip.offsets[ride.board],
      arrives: ride.trip.start + ride.trip.offsets[ride.alight],
    });
    round = ride.round - 1;
    const next = arriveParent[round][to];
    if (!next) throw new Error(`Broken last-train trace at ${name(to)} in round ${round}`);
    if (next.kind === "home") break;
    if (next.kind === "walk-home") {
      legs.push({ kind: "walk", from: name(to), to: home, seconds: next.seconds });
      break;
    }
    station = to;
    if (next.kind === "walk") {
      legs.push({ kind: "walk", from: name(to), to: name(next.to), seconds: next.seconds });
      station = next.to;
    }
  }

  const rides = legs.flatMap((leg) => (leg.kind === "ride" ? [leg] : []));
  return {
    kind: "train",
    departs,
    firstTrain: rides[0].departs,
    legs,
    transfers: rides.slice(0, -1).map((ride) => ride.to),
  };
}
