import { bucketIndex, type Graph, type Leg } from "@/lib/gtfs/types";
import type { DayType, HourBucket } from "@/lib/time";

export type TravelStep =
  | {
      kind: "ride";
      from: string;
      to: string;
      routes: string[];
      waitSeconds: number;
      rideSeconds: number;
    }
  | { kind: "walk"; from: string; to: string; seconds: number };

export type Travel = {
  seconds: number;
  steps: TravelStep[];
  /** Stations where the trip leaves one train to take another, perhaps after a walk. */
  transfers: string[];
};

type Edge = { to: number; seconds: number; step: TravelStep };

const adjacency = new WeakMap<Graph, Map<string, Edge[][]>>();

function edgesFor(graph: Graph, dayType: DayType, bucket: number): Edge[][] {
  let byKey = adjacency.get(graph);
  if (!byKey) {
    byKey = new Map();
    adjacency.set(graph, byKey);
  }
  const key = `${dayType}|${bucket}`;
  const cached = byKey.get(key);
  if (cached) return cached;

  const edges: Edge[][] = graph.stations.map(() => []);
  const name = (i: number) => graph.stations[i];
  graph.legs[dayType].forEach((leg: Leg) => {
    const ride = leg.ride[bucket];
    const wait = leg.wait[bucket];
    const routes = leg.routes[bucket];
    if (ride === null || wait === null || routes === null) return;
    edges[leg.from].push({
      to: leg.to,
      seconds: wait + ride,
      step: {
        kind: "ride",
        from: name(leg.from),
        to: name(leg.to),
        routes: graph.routeSets[routes],
        waitSeconds: wait,
        rideSeconds: ride,
      },
    });
  });
  for (const walk of graph.walks) {
    edges[walk.from].push({
      to: walk.to,
      seconds: walk.seconds,
      step: { kind: "walk", from: name(walk.from), to: name(walk.to), seconds: walk.seconds },
    });
  }
  byKey.set(key, edges);
  return edges;
}

/**
 * Expected platform-to-platform time by T (DATA 3.1): the expected wait and the median scheduled
 * ride for each ride, plus the station's transfer time before any ride that follows another
 * ride. Walks between stations already include their transfer time.
 */
export function travelTime(
  graph: Graph,
  fromStation: string,
  toStation: string,
  dayType: DayType,
  bucket: HourBucket,
): Travel | null {
  const origin = graph.stations.indexOf(fromStation);
  const target = graph.stations.indexOf(toStation);
  if (origin === -1 || target === -1) return null;
  if (origin === target) return { seconds: 0, steps: [], transfers: [] };

  const edges = edgesFor(graph, dayType, bucketIndex(bucket));
  // State = station * 2 + (1 when the station was reached by a ride).
  const states = graph.stations.length * 2;
  const best = new Array<number>(states).fill(Infinity);
  const previous = new Array<{ state: number; step: TravelStep } | undefined>(states);
  const done = new Array<boolean>(states).fill(false);
  best[origin * 2] = 0;

  for (;;) {
    let current = -1;
    for (let s = 0; s < states; s++) {
      if (!done[s] && best[s] < Infinity && (current === -1 || best[s] < best[current]))
        current = s;
    }
    if (current === -1) return null;
    const station = Math.floor(current / 2);
    if (station === target) return route(previous, current, best[current]);
    done[current] = true;

    const rode = current % 2 === 1;
    for (const edge of edges[station]) {
      const isRide = edge.step.kind === "ride";
      const penalty = isRide && rode ? graph.transferSeconds[station] : 0;
      const next = edge.to * 2 + (isRide ? 1 : 0);
      const seconds = best[current] + penalty + edge.seconds;
      if (seconds < best[next]) {
        best[next] = seconds;
        previous[next] = { state: current, step: edge.step };
      }
    }
  }
}

function route(
  previous: ({ state: number; step: TravelStep } | undefined)[],
  end: number,
  seconds: number,
): Travel {
  const steps: TravelStep[] = [];
  for (let s = previous[end]; s; s = previous[s.state]) steps.unshift(s.step);
  const rides = steps.filter((step) => step.kind === "ride");
  const transfers = rides.slice(0, -1).map((ride) => ride.to);
  return { seconds: Math.round(seconds), steps, transfers };
}
